package tn.enis.medproof.contracts;

import net.corda.core.serialization.CordaSerializable;

@CordaSerializable
public enum DocumentStatus {
    CREATED, UPDATED, REVOKED
}