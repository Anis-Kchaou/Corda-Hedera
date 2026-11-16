package tn.enis.medproof.contracts;

import net.corda.core.contracts.BelongsToContract;
import net.corda.core.contracts.LinearState;
import net.corda.core.contracts.UniqueIdentifier;
import net.corda.core.identity.AbstractParty;
import net.corda.core.identity.Party;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * État enregistré sur Corda pour chaque cas.
 * Aucune donnée médicale ici : seulement l'identifiant pseudonymisé, le hash et des métadonnées.
 */
@BelongsToContract(MedicalProofContract.class)
public class MedicalProofState implements LinearState {

    private final String caseId;
    private final String documentHash;   // SHA-256 hexadécimal (64 caractères)
    private final String documentType;
    private final Instant createdAt;
    private final DocumentStatus status;
    private final String storageRef;     // référence vers le stockage hors chaîne
    private final Party issuer;          // hôpital / laboratoire / clinique
    private final List<Party> observers;
    private final UniqueIdentifier linearId;

    public MedicalProofState(String caseId, String documentHash, String documentType,
                             Instant createdAt, DocumentStatus status, String storageRef,
                             Party issuer, List<Party> observers, UniqueIdentifier linearId) {
        this.caseId = caseId;
        this.documentHash = documentHash;
        this.documentType = documentType;
        this.createdAt = createdAt;
        this.status = status;
        this.storageRef = storageRef;
        this.issuer = issuer;
        this.observers = observers;
        this.linearId = linearId;
    }

    public String getCaseId() { return caseId; }
    public String getDocumentHash() { return documentHash; }
    public String getDocumentType() { return documentType; }
    public Instant getCreatedAt() { return createdAt; }
    public DocumentStatus getStatus() { return status; }
    public String getStorageRef() { return storageRef; }
    public Party getIssuer() { return issuer; }
    public List<Party> getObservers() { return observers; }

    @Override
    public UniqueIdentifier getLinearId() { return linearId; }

    @Override
    public List<AbstractParty> getParticipants() {
        List<AbstractParty> all = new ArrayList<>();
        all.add(issuer);
        all.addAll(observers);
        return all;
    }
}