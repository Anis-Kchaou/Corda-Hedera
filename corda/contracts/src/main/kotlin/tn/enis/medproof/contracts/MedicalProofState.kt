package tn.enis.medproof.contracts

import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.AbstractParty
import net.corda.core.identity.Party
import net.corda.core.serialization.CordaSerializable
import java.time.Instant

@CordaSerializable
enum class DocumentStatus { CREATED, UPDATED, REVOKED }

/**
 * État enregistré sur Corda pour chaque cas.
 * Aucune donnée médicale ici : seulement l'identifiant pseudonymisé, le hash et des métadonnées.
 */
@BelongsToContract(MedicalProofContract::class)
data class MedicalProofState(
    val caseId: String,
    val documentHash: String,       // SHA-256 hexadécimal (64 caractères)
    val documentType: String,
    val createdAt: Instant,
    val status: DocumentStatus,
    val storageRef: String,         // référence vers le stockage hors chaîne
    val issuer: Party,              // hôpital / laboratoire / clinique
    val observers: List<Party> = emptyList(),
    override val linearId: UniqueIdentifier = UniqueIdentifier()
) : LinearState {
    override val participants: List<AbstractParty> get() = listOf(issuer) + observers
}
