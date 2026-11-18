package com.template.webserver;

import net.corda.core.contracts.StateAndRef;
import net.corda.core.identity.CordaX500Name;
import net.corda.core.identity.Party;
import net.corda.core.messaging.CordaRPCOps;
import net.corda.core.messaging.FlowHandle;
import net.corda.core.node.services.Vault;
import net.corda.core.node.services.vault.PageSpecification;
import net.corda.core.node.services.vault.QueryCriteria;
import net.corda.core.node.services.vault.Sort;
import net.corda.core.node.services.vault.SortAttribute;
import net.corda.core.transactions.SignedTransaction;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tn.enis.medproof.contracts.MedicalProofState;
import tn.enis.medproof.flows.CreateMedicalProofFlow;
import tn.enis.medproof.flows.UpdateMedicalProofStatusFlow;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;

/**
 * Pont REST entre le middleware Python et le nœud Corda Hospital.
 * Routes attendues par middleware/app/clients/corda_client.py.
 */
@RestController
public class MedicalProofController {

    private static final int PAGE_SIZE = 200;
    private static final DateTimeFormatter TS =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx");

    private final CordaRPCOps proxy;
    private final String observersConfig;

    public MedicalProofController(NodeRPCConnection rpc,
                                  @Value("${app.observers:O=Laboratory,L=Sfax,C=TN}") String observersConfig) {
        this.proxy = rpc.proxy;
        this.observersConfig = observersConfig;
    }

    // ---------- POST /cases ----------

    @PostMapping("/cases")
    public ResponseEntity<Map<String, Object>> createCase(@RequestBody Map<String, String> body) {
        final String caseId = body.get("case_id");
        final String hash = body.get("document_hash");
        final String type = body.get("document_type");
        final String storageRef = body.get("storage_ref");

        if (blank(caseId) || blank(hash) || blank(type) || blank(storageRef)) {
            return error(HttpStatus.BAD_REQUEST,
                    "Champs requis : case_id, document_hash, document_type, storage_ref");
        }
        if (findActive(caseId) != null) {
            return error(HttpStatus.CONFLICT, "Un état existe déjà pour " + caseId);
        }
        return start(() -> proxy.startFlowDynamic(CreateMedicalProofFlow.class,
                caseId, hash, type, storageRef, resolveObservers()));
    }

    // ---------- POST /cases/{caseId}/status ----------

    @PostMapping("/cases/{caseId}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable("caseId") String caseId,
                                                            @RequestBody Map<String, String> body) {
        final String status = body.get("status");
        if (blank(status)) {
            return error(HttpStatus.BAD_REQUEST, "Champ requis : status");
        }
        if (findActive(caseId) == null) {
            return error(HttpStatus.NOT_FOUND, "Aucun état pour " + caseId);
        }
        return start(() -> proxy.startFlowDynamic(UpdateMedicalProofStatusFlow.class, caseId, status));
    }

    // ---------- GET /states/{caseId} ----------

    @GetMapping("/states/{caseId}")
    public ResponseEntity<Map<String, Object>> getState(@PathVariable("caseId") String caseId) {
        StateAndRef<MedicalProofState> ref = findActive(caseId);
        if (ref == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        MedicalProofState s = ref.getState().getData();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("case_id", s.getCaseId());
        m.put("document_hash", s.getDocumentHash());
        m.put("document_type", s.getDocumentType());
        m.put("storage_ref", s.getStorageRef());
        m.put("status", s.getStatus().name());
        m.put("tx_id", txId(ref));
        m.put("created_at", ts(s.getCreatedAt()));
        return ResponseEntity.ok(m);
    }

    // ---------- GET /events?cursor=N ----------

    @GetMapping("/events")
    public Map<String, Object> events(@RequestParam(name = "cursor", defaultValue = "0") int cursor) {
        QueryCriteria criteria = new QueryCriteria.VaultQueryCriteria(Vault.StateStatus.ALL);
        Sort sort = new Sort(Collections.singleton(new Sort.SortColumn(
                new SortAttribute.Standard(Sort.VaultStateAttribute.RECORDED_TIME), Sort.Direction.ASC)));

        List<Map<String, Object>> all = new ArrayList<>();
        Set<UUID> seen = new HashSet<>();
        int pageNumber = 1;
        while (true) {
            Vault.Page<MedicalProofState> page = proxy.vaultQueryBy(
                    criteria, new PageSpecification(pageNumber, PAGE_SIZE), sort, MedicalProofState.class);
            List<StateAndRef<MedicalProofState>> states = page.getStates();
            List<Vault.StateMetadata> meta = page.getStatesMetadata();

            for (int i = 0; i < states.size(); i++) {
                StateAndRef<MedicalProofState> ref = states.get(i);
                MedicalProofState s = ref.getState().getData();
                // Le premier état d'un dossier (même linearId) est sa création, les suivants des mises à jour.
                boolean first = seen.add(s.getLinearId().getId());

                Map<String, Object> ev = new LinkedHashMap<>();
                ev.put("tx_id", txId(ref));
                ev.put("case_id", s.getCaseId());
                ev.put("document_hash", s.getDocumentHash());
                ev.put("document_type", s.getDocumentType());
                ev.put("event_type", first ? "CASE_CREATED" : "STATUS_UPDATED");
                ev.put("timestamp", ts(meta.get(i).getRecordedTime()));
                all.add(ev);
            }
            if (states.size() < PAGE_SIZE) {
                break;
            }
            pageNumber++;
        }

        int from = Math.min(Math.max(cursor, 0), all.size());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("events", new ArrayList<>(all.subList(from, all.size())));
        result.put("next_cursor", all.size());
        return result;
    }

    // ---------- Outils ----------

    private ResponseEntity<Map<String, Object>> start(Callable<FlowHandle<SignedTransaction>> starter) {
        try {
            SignedTransaction stx = starter.call().getReturnValue().get();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("tx_id", stx.getId().toString().toLowerCase(Locale.ROOT));
            return ResponseEntity.ok(m);
        } catch (ExecutionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            return error(HttpStatus.UNPROCESSABLE_ENTITY, String.valueOf(cause.getMessage()));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Interrompu");
        } catch (Exception e) {
            return error(HttpStatus.BAD_GATEWAY, "Pont Corda : " + e.getMessage());
        }
    }

    private StateAndRef<MedicalProofState> findActive(String caseId) {
        Vault.Page<MedicalProofState> page = proxy.vaultQuery(MedicalProofState.class);
        for (StateAndRef<MedicalProofState> s : page.getStates()) {
            if (s.getState().getData().getCaseId().equals(caseId)) {
                return s;
            }
        }
        return null;
    }

    private List<Party> resolveObservers() {
        List<Party> result = new ArrayList<>();
        for (String raw : observersConfig.split(";")) {
            String name = raw.trim();
            if (name.isEmpty()) {
                continue;
            }
            Party p = proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(name));
            if (p == null) {
                throw new IllegalStateException("Observateur introuvable : " + name);
            }
            result.add(p);
        }
        return result;
    }

    private static String txId(StateAndRef<?> ref) {
        return ref.getRef().getTxhash().toString().toLowerCase(Locale.ROOT);
    }

    private static String ts(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC).format(TS);
    }

    private static boolean blank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("error", message);
        return ResponseEntity.status(status).body(m);
    }
}