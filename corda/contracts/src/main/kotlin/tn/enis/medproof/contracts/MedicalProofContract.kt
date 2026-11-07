package tn.enis.medproof.contracts

import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.transactions.LedgerTransaction

class MedicalProofContract : Contract {
    companion object {
        const val ID = "tn.enis.medproof.contracts.MedicalProofContract"
        private val SHA256_HEX = Regex("^[0-9a-f]{64}$")
    }

    interface Commands : CommandData {
        class Create : Commands
        class UpdateStatus : Commands   // TODO : implémenter la mise à jour du statut
    }

    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<Commands>()
        when (command.value) {
            is Commands.Create -> requireThat {
                "Aucune entrée à la création" using tx.inputs.isEmpty()
                "Exactement une sortie" using (tx.outputs.size == 1)
                val out = tx.outputsOfType<MedicalProofState>().single()
                "Le Case ID ne doit pas être vide" using out.caseId.isNotBlank()
                "Le hash doit être un SHA-256 hexadécimal" using out.documentHash.matches(SHA256_HEX)
                "L'émetteur doit signer" using command.signers.contains(out.issuer.owningKey)
            }
            is Commands.UpdateStatus -> {
                // TODO : une entrée, une sortie, même caseId et même hash, statut modifié, émetteur signataire
            }
        }
    }
}
