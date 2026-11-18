package tn.enis.medproof.flows;

import co.paralleluniverse.fibers.Suspendable;
import net.corda.core.contracts.StateAndRef;
import net.corda.core.flows.FinalityFlow;
import net.corda.core.flows.FlowException;
import net.corda.core.flows.FlowLogic;
import net.corda.core.flows.FlowSession;
import net.corda.core.flows.InitiatingFlow;
import net.corda.core.flows.StartableByRPC;
import net.corda.core.identity.Party;
import net.corda.core.transactions.SignedTransaction;
import net.corda.core.transactions.TransactionBuilder;
import tn.enis.medproof.contracts.DocumentStatus;
import tn.enis.medproof.contracts.MedicalProofContract;
import tn.enis.medproof.contracts.MedicalProofState;

import java.util.ArrayList;
import java.util.List;

@InitiatingFlow
@StartableByRPC
public class UpdateMedicalProofStatusFlow extends FlowLogic<SignedTransaction> {

    private final String caseId;
    private final String newStatus;

    public UpdateMedicalProofStatusFlow(String caseId, String newStatus) {
        this.caseId = caseId;
        this.newStatus = newStatus;
    }

    @Suspendable
    @Override
    public SignedTransaction call() throws FlowException {
        DocumentStatus target;
        try {
            target = DocumentStatus.valueOf(newStatus);
        } catch (IllegalArgumentException e) {
            throw new FlowException("Statut inconnu : " + newStatus + " (CREATED, UPDATED ou REVOKED)");
        }

        List<StateAndRef<MedicalProofState>> matches = new ArrayList<>();
        for (StateAndRef<MedicalProofState> ref :
                getServiceHub().getVaultService().queryBy(MedicalProofState.class).getStates()) {
            if (ref.getState().getData().getCaseId().equals(caseId)) {
                matches.add(ref);
            }
        }
        if (matches.size() != 1) {
            throw new FlowException("Attendu : 1 état non consommé pour " + caseId
                    + ", trouvé : " + matches.size());
        }

        StateAndRef<MedicalProofState> inputRef = matches.get(0);
        MedicalProofState in = inputRef.getState().getData();
        Party me = getOurIdentity();

        if (!in.getIssuer().equals(me)) {
            throw new FlowException("Seul l'émetteur peut modifier le statut");
        }

        MedicalProofState out = new MedicalProofState(
                in.getCaseId(), in.getDocumentHash(), in.getDocumentType(), in.getCreatedAt(),
                target, in.getStorageRef(), in.getIssuer(), in.getObservers(), in.getLinearId());

        Party notary = inputRef.getState().getNotary();
        TransactionBuilder builder = new TransactionBuilder(notary)
                .addInputState(inputRef)
                .addOutputState(out, MedicalProofContract.ID)
                .addCommand(new MedicalProofContract.Commands.UpdateStatus(), me.getOwningKey());

        builder.verify(getServiceHub());
        SignedTransaction signed = getServiceHub().signInitialTransaction(builder);

        List<FlowSession> sessions = new ArrayList<>();
        for (Party observer : in.getObservers()) {
            sessions.add(initiateFlow(observer));
        }
        return subFlow(new FinalityFlow(signed, sessions));
    }
}