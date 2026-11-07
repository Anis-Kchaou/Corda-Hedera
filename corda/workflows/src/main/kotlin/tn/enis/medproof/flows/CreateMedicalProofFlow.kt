package tn.enis.medproof.flows

import co.paralleluniverse.fibers.Suspendable
import net.corda.core.contracts.Command
import net.corda.core.flows.FinalityFlow
import net.corda.core.flows.FlowLogic
import net.corda.core.flows.FlowSession
import net.corda.core.flows.InitiatedBy
import net.corda.core.flows.InitiatingFlow
import net.corda.core.flows.ReceiveFinalityFlow
import net.corda.core.flows.StartableByRPC
import net.corda.core.identity.Party
import net.corda.core.transactions.SignedTransaction
import net.corda.core.transactions.TransactionBuilder
import tn.enis.medproof.contracts.DocumentStatus
import tn.enis.medproof.contracts.MedicalProofContract
import tn.enis.medproof.contracts.MedicalProofState
import java.time.Instant

@InitiatingFlow
@StartableByRPC
class CreateMedicalProofFlow(
    private val caseId: String,
    private val documentHash: String,
    private val documentType: String,
    private val storageRef: String,
    private val observers: List<Party> = emptyList()
) : FlowLogic<SignedTransaction>() {

    @Suspendable
    override fun call(): SignedTransaction {
        val notary = serviceHub.networkMapCache.notaryIdentities.first()
        val state = MedicalProofState(
            caseId, documentHash, documentType, Instant.now(),
            DocumentStatus.CREATED, storageRef, ourIdentity, observers
        )
        val builder = TransactionBuilder(notary)
            .addOutputState(state, MedicalProofContract.ID)
            .addCommand(Command(MedicalProofContract.Commands.Create(), ourIdentity.owningKey))

        builder.verify(serviceHub)
        val signed = serviceHub.signInitialTransaction(builder)
        val sessions = observers.map { initiateFlow(it) }
        return subFlow(FinalityFlow(signed, sessions))
    }
}

@InitiatedBy(CreateMedicalProofFlow::class)
class CreateMedicalProofResponder(private val otherSide: FlowSession) : FlowLogic<Unit>() {
    @Suspendable
    override fun call() {
        subFlow(ReceiveFinalityFlow(otherSide))
    }
}
