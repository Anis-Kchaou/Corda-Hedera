package tn.enis.medproof.flows;

import co.paralleluniverse.fibers.Suspendable;
import net.corda.core.contracts.UniqueIdentifier;
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

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@InitiatingFlow
@StartableByRPC
public class CreateMedicalProofFlow extends FlowLogic<SignedTransaction> {

    private final String caseId;
    private final String documentHash;
    private final String documentType;
    private final String storageRef;
    private final List<Party> observers;

    public CreateMedicalProofFlow(String caseId, String documentHash, String documentType,
                                  String storageRef, List<Party> observers) {
        this.caseId = caseId;
        this.documentHash = documentHash;
        this.documentType = documentType;
        this.storageRef = storageRef;
        this.observers = observers;
    }

    @Suspendable
    @Override
    public SignedTransaction call() throws FlowException {
        Party notary = getServiceHub().getNetworkMapCache().getNotaryIdentities().get(0);
        Party me = getOurIdentity();

        MedicalProofState state = new MedicalProofState(
                caseId, documentHash, documentType, Instant.now(),
                DocumentStatus.CREATED, storageRef, me, observers, new UniqueIdentifier());

        TransactionBuilder builder = new TransactionBuilder(notary)
                .addOutputState(state, MedicalProofContract.ID)
                .addCommand(new MedicalProofContract.Commands.Create(), me.getOwningKey());

        builder.verify(getServiceHub());
        SignedTransaction signed = getServiceHub().signInitialTransaction(builder);

        List<FlowSession> sessions = new ArrayList<>();
        for (Party observer : observers) {
            sessions.add(initiateFlow(observer));
        }
        return subFlow(new FinalityFlow(signed, sessions));
    }
}