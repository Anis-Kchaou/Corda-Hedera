package tn.enis.medproof.contracts;

import net.corda.core.contracts.CommandData;
import net.corda.core.contracts.CommandWithParties;
import net.corda.core.contracts.Contract;
import net.corda.core.transactions.LedgerTransaction;

import java.security.PublicKey;
import java.util.List;
import java.util.regex.Pattern;

import static net.corda.core.contracts.ContractsDSL.requireSingleCommand;
import static net.corda.core.contracts.ContractsDSL.requireThat;

public class MedicalProofContract implements Contract {

    public static final String ID = "tn.enis.medproof.contracts.MedicalProofContract";
    private static final Pattern SHA256_HEX = Pattern.compile("^[0-9a-f]{64}$");

    public interface Commands extends CommandData {
        class Create implements Commands {}
        class UpdateStatus implements Commands {}
    }

    @Override
    public void verify(LedgerTransaction tx) {
        final CommandWithParties<Commands> command = requireSingleCommand(tx.getCommands(), Commands.class);
        final List<PublicKey> signers = command.getSigners();

        if (command.getValue() instanceof Commands.Create) {
            requireThat(req -> {
                req.using("Aucune entrée à la création", tx.getInputs().isEmpty());
                req.using("Exactement une sortie", tx.getOutputs().size() == 1);
                req.using("La sortie doit être un MedicalProofState",
                        tx.outputsOfType(MedicalProofState.class).size() == 1);
                MedicalProofState out = tx.outputsOfType(MedicalProofState.class).get(0);
                req.using("Le Case ID ne doit pas être vide", !out.getCaseId().trim().isEmpty());
                req.using("Le hash doit être un SHA-256 hexadécimal",
                        SHA256_HEX.matcher(out.getDocumentHash()).matches());
                req.using("L'émetteur doit signer", signers.contains(out.getIssuer().getOwningKey()));
                return null;
            });
        } else if (command.getValue() instanceof Commands.UpdateStatus) {
            requireThat(req -> {
                req.using("Une entrée", tx.getInputs().size() == 1);
                req.using("Une sortie", tx.getOutputs().size() == 1);
                req.using("Entrée et sortie doivent être des MedicalProofState",
                        tx.inputsOfType(MedicalProofState.class).size() == 1
                                && tx.outputsOfType(MedicalProofState.class).size() == 1);
                MedicalProofState in = tx.inputsOfType(MedicalProofState.class).get(0);
                MedicalProofState out = tx.outputsOfType(MedicalProofState.class).get(0);
                req.using("Le Case ID ne doit pas changer", in.getCaseId().equals(out.getCaseId()));
                req.using("Le hash ne doit pas changer", in.getDocumentHash().equals(out.getDocumentHash()));
                req.using("Le statut doit changer", in.getStatus() != out.getStatus());
                req.using("L'émetteur doit signer", signers.contains(in.getIssuer().getOwningKey()));
                return null;
            });
        } else {
            throw new IllegalArgumentException("Commande inconnue");
        }
    }
}