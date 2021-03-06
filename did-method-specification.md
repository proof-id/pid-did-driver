# DID method specification

Version: 0.1

CAUTION: THIS DOCUMENT IS REFERENCED IN W3C'S [DID METHOD REGISTRY][w3c-did-method-registry].

## Status of this document

The ProofID blockchain will evolve: it will become permissionless and will transition from a testnet to a persistent testnet.
When such network evolutions happen, this specification will be updated and the version number will be bumped.

## 1. Method and Identifier

### 1.1. Method

The identifier for ProofID DID Method is `did`.

A ProofID DID starts with `did:pid:`.

It conforms with the [generic DID syntax][w3c-did-spec-syntax].

### 1.2. DID Method-specific identifier

The DID Method-specific identifier is an [ss58][ss58] public address, generated by encoding the **signing** public key of a ProofID Identity.

## 2. DIDs in ProofID

ProofID DIDs are stored on ProofID's blockchain that is public and by definition decentralized.
The ProofID Blockchain runs in a proof-of-authority manner and will become permissionless, see `§ Status of this document` in this specification document.

ProofID Blockchain nodes implement a DID module to create, store, query and manage DIDs in the form of on-chain **DID items**.
A DID item is a mapping between the DID owner's public address and its public signature key `sign_key`, its public encryption key `box_key`, and an optional location for the associated DID Document `doc_ref`:

`owner => (sign_key, box_key, doc_ref)`

## 3. Operations

### 3.1. Operation: Create a DID and a DID Document

#### 3.1.1. Create a DID

An `add` function can be used to store a DID item on the ProofID Blockchain; this function takes the following parameters:

* `owner`: the public ss58 address of the caller of the method;
* `sign_key`: the public signing key of the owner (= ProofID identity corresponding to this DID);
* `box_key`: the public encryption key of the owner (= ProofID identity corresponding to this DID);
* `doc_ref`: optional reference to the storage location of a DID document; typically a URL.

The blockchain node verifies the transaction signature corresponding to the owner and inserts it to the blockchain storage by using a map:

```rust
owner => (sign_key, box_key, doc_ref)
```

Example of a DID item's contents before encoding and storage:

```rust
{
  "sign_key": "4pGH3yEbqLFXhqG6UJZdFz2xfTFEk9XNVQuGTbs1K25huExq",
  "box_key": "4rJv64TJQvDrz1rP7TjQ7w3QcKQfHJ86FN3LxFpBfvF92Ld7",
  "doc_ref": "4sd9F5LLJzbLS7iEQXdjK2EtuE39bb15oXjjLQUmpPpG3YYv"
}
```

#### 3.1.2 Create (and optionally store) the associated DID Document

A DID Document can be either:

* (**Mode 1 = static**) Pregenerated and stored on a server;
  
  or
* (**Mode 2 = dynamic**) Dynamically generated on-demand.

Mode 2 is covered in `§3.2 Operation: Read/Resolve a DID to a DID Document` in this specification document.

Mode 1 works as follows:

The DID document corresponding to a DID item can be created by using the structure outlined below.
`<address>`, `<sign_key>` and `<box_key>` should be replaced by their respective values in the on-chain DID item.

DID Document:

```json
{
  "id": "did:pid:<address>",
  "authentication": {
    "type": "Ed25519VerificationKey2018",
    "publicKey": [
      "did:pid:<address>#key-1"
    ]
  },
  "verificationMethod": [
    {
      "id": "did:pid:<address>#key-1",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:pid:<address>",
      "publicKeyBase58": <sign_key>
    },
    {
      "id": "did:pid:<address>#key-2",
      "type": "X25519Salsa20Poly1305Key2018",
      "controller": "did:pid:<address>",
      "publicKeyBase58": <box_key>
    }
  ],
  "@context": ["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/ed25519-2018/v1"],
  "service": [
    {
      "type": "PidMessagingService",
      "serviceEndpoint": "//services.pid.io:443/messaging"
    }
  ]
}
```

Once created, the document shall be stored on the `doc_ref` specified at DID item creation (see `§3.1.1. Create a DID` in this specification document). Note that the ProofID does not enforce that the DID Document is actually stored and available at the specified `doc_ref`.

A signed hash of the DID Document can and should be appended to the stored data in order to prevent tampering. More on that in `§4. Security and Privacy considerations` in this specification document.

#### 3.1.3. Proving control

As stated in the [DID specification][w3c-did-spec-control], proving control of a DID means proving the **binding** between this DID and the DID Document that describes it. It is a two step process:

* Resolving the DID to a DID Document according to the ProofID DID Method specification, as detailed in `§3.2 Operation: Read/Resolve a DID to a DID Document` in this specification document;
* Verifying that the `id` property of the resulting DID Document matches the DID that was resolved.

### 3.2. Operation: Read/Resolve a DID to a DID Document

* (Mode 1 = static) If the DID Document has been pregenerated and stored off-chain on a server i.e. if the DID item specifies a document storage location (`doc_ref`), the DID Document can be accessed as followed:

Query the ProofID blockchain for the DID item => Get the DID Document's storage location from the DID item (doc_ref) => Fetch the DID Document at the specified location.

Once the chain query result is received, it should first be converted to JSON.
Decoding can be done as follows:

```
publicSigningKey: resultAsJSON[0]
publicBoxKey: resultAsJSON[1]
documentStore = hexadecimal to string of resultAsJSON[2]
```

Once the DID Document's storage location is determined, a standard HTTP/HTTPS fetch _may_ be used to retrieve the associated DID Document. Yet depending on the storage location type, other techniques might need to be used.

* (Mode 2 = dynamic) In this mode, a DID Document can be generated on-the-fly by a DID subject and sent to any requesting entity as needed. The DID Document can be generated from a ProofID Identity or by using the template provided in `§3.1.2 Create (and optionally store) the associated DID Document` in this specification document.

### 3.3. Operation: Update the DID Document

If the DID Document has been pregenerated and stored off-chain on a server (Mode 1 = static), the DID Document can be updated on the specified storage.
It **must be ensured that the identity operating the update is authorized to do so**, e.g. by making use of the `authentication` property in the DID Document.

### 3.4. Operation: Deactivate

Deactivating a DID can be done by using the ProofID blockchain's `remove` method on a DID.
This removes the document storage location property, effectively unlinking a DID from its DID Document.

## 4. Security Considerations

This section provides the security consideration for the DID method implementation.

* An identity that generates a DID item also has effective control over the DID Document that it is connected with. As a result, the private key associated with this identity should be kept completely confidential.
* In the event of a compromised key, the participant is required to deactivate any existing DID immediately.
* The DID controller server SHOULD be set to only handle encryption that are considered to be strong.
* The DID controller is responsible for storing the private key in a safe location.
* Instead of writing client apps that directly gather authentication information from users, developers of a DID controller should transfer this work to a trusted system component (for example, the system browser).
* The DID controller is responsible for ensuring the security of the application architecture. The participant SHOULD include the essential security measures within the application as well as anti-fraud capabilities to protect against fraud.
* As soon as a mobile application is made available for public distribution, the participant must guarantee that it is obfuscated and signed with a trust certificate, in order for the DID method to be invoked successfully.
* DID controllers are held accountable for the generation and storage of keys in a safe manner on cryptographic storage devices such as the Hardware Security Module (HSM) in their infrastructure.
* DID controller is responsible for seeing to it that that the program is frequently tested for security flaws and that no exploitable vulnerabilities are found.
* The DID controller SHOULD NOT make use of any third-party libraries that are susceptible to attack. The DID controller is responsible for ensuring that the application code has been checked for security vulnerabilities and that there are no exploitable flaws currently open in the system.
* It is the responsibility of the DID controller to guarantee that its application does not re-use the same cryptographic keys for more than one purpose.
* The DID controller SHOULD incorporate rate limiting techniques in order to prevent the platform from being overloaded.
* The DID controller SHOULD put in place security auditing procedures.

### 4.2. DID Document tampering

If the DID Document has been pregenerated and stored off-chain on a server (Mode 1 = static), it is strongly encouraged to make use of a digital signature on the DID Document to prevent data tampering:

* The controller of the DID Document should send it, together with a signed hash, to the server;
* The server should verify this signature on create events and update events on the DID Document;
* Any consumer of the DID Document, such as an entity accessing the off-chain DID Document in order to establish a secure communication channel with the given DID Subject, should verify the signature as well.

## 5. Privacy Considerations

This section provides the privacy consideration for the DID method implementation.

* A DID document does not include any personal information about the user.
* The DID controller is responsible for ensuring the integrity and confidentiality of the personal data of users. The DID controller is responsible for ensuring that all relevant privacy and data protection laws, rules, and principles are followed by the DID controller.
* The DID controller must ensure that the relevant security mechanisms are in place to secure the personal data of users if this is required by law.
* The DID controller is responsible for ensuring that no personally identifiable information is recorded in any system or application log.
* If the DID controller determines that the application is storing personal data in temporary memory, the application will be terminated.
* The DID controller MUST have confidentiality safeguards in place in order to prevent the content of conversations from being monitored.

## 6. SDK

The [ProofID SDK][sdk] is a convenient tool to interact with the ProofID blockchain. There is no technical constraint to use the ProofID SDK to use ProofID DIDs.

The following table lists the methods available in the SDK to perform each DID-related operation.

| Operation   |      ProofID SDK function   |
|----------|------|
| Create a DID | `fromIdentity` |
| Create a DID Document |  `createDefaultDidDocument` |
| Read/Resolve a DID to a DID Document | `queryByIdentifier`/`queryByAdress` and access `documentStore` (= `doc_ref`) in Mode 1 = static, or `createDefaultDidDocument` in Mode 2 = dynamic |
| Deactivate | `remove` |
| Sign a DID Document | `signDidDocument` |
| Verify the signature of a DID Document | `verifyDidDocumentSignature` |

[sdk]: https://github.com/proofid/pid-js-lib
[w3c-did-core]: https://w3c.github.io/did-core/
[w3c-did-spec-syntax]: https://w3c-ccg.github.io/did-spec/#generic-did-syntax
[w3c-did-spec-control]: https://w3c-ccg.github.io/did-spec/#proving-control-of-a-did-and-did-document
[w3c-did-method-registry]: https://w3c-ccg.github.io/did-method-registry/
[ss58]: https://github.com/paritytech/substrate/wiki/External-Address-Format-(SS58)
