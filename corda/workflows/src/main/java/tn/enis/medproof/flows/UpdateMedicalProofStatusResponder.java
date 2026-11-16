package tn.enis.medproof.flows;

import co.paralleluniverse.fibers.Suspendable;
import net.corda.core.flows.FlowException;
import net.corda.core.flows.FlowLogic;
import net.corda.core.flows.FlowSession;
import net.corda.core.flows.InitiatedBy;
import net.corda.core.flows.ReceiveFinalityFlow;

@InitiatedBy(UpdateMedicalProofStatusFlow.class)
public class UpdateMedicalProofStatusResponder extends FlowLogic<Void> {

    private final FlowSession otherSide;

    public UpdateMedicalProofStatusResponder(FlowSession otherSide) {
        this.otherSide = otherSide;
    }

    @Suspendable
    @Override
    public Void call() throws FlowException {
        subFlow(new ReceiveFinalityFlow(otherSide));
        return null;
    }
}