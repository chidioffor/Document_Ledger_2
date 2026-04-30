// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DocumentRegistry
 * @notice Sayari Global Holding – Document Ledger
 *         Institutional-grade on-chain document certification registry.
 * @dev    Deploy with Foundry (forge). After deployment paste the contract
 *         address into the HTML dApp's CONTRACT_ADDRESS constant.
 */
contract DocumentRegistry {

    // ─────────────────────────────────────────────────────────────────────────
    // Data structures
    // ─────────────────────────────────────────────────────────────────────────

    struct Document {
        bytes32  docHash;          // SHA-256 of the original file (client-side)
        address  certifier;        // wallet that submitted the tx
        uint256  timestamp;        // block.timestamp at registration
        string   title;            // human-readable title (optional)
        string   ipfsCID;          // IPFS content identifier (optional)
        string   version;          // document version string (optional)
        uint256  expiry;           // unix timestamp; 0 = no expiry
        bool     revoked;          // soft-delete / revocation flag
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev primary registry: hash → Document
    mapping(bytes32 => Document) private _registry;

    /// @dev ordered list of all hashes ever registered (for enumeration)
    bytes32[] private _allHashes;

    /// @dev per-address list of hashes (for certifier filtering)
    mapping(address => bytes32[]) private _byAddress;

    address public immutable owner;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event DocumentCertified(
        bytes32 indexed docHash,
        address indexed certifier,
        uint256 timestamp,
        string  title
    );

    event DocumentRevoked(
        bytes32 indexed docHash,
        address indexed revokedBy,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error AlreadyCertified(bytes32 docHash);
    error NotFound(bytes32 docHash);
    error NotAuthorized();
    error ZeroHash();

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Write functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Certify a document hash on-chain.
     * @param  docHash  SHA-256 of the file, encoded as bytes32.
     * @param  title    Human-readable title (may be empty string).
     * @param  ipfsCID  IPFS CID if document is stored on IPFS (may be empty).
     * @param  version  Version label, e.g. "v1.0" (may be empty).
     * @param  expiry   Unix timestamp after which document is considered expired.
     *                  Pass 0 for no expiry.
     */
    function certify(
        bytes32 docHash,
        string calldata title,
        string calldata ipfsCID,
        string calldata version,
        uint256 expiry
    ) external {
        if (docHash == bytes32(0)) revert ZeroHash();
        if (_registry[docHash].timestamp != 0) revert AlreadyCertified(docHash);

        _registry[docHash] = Document({
            docHash:   docHash,
            certifier: msg.sender,
            timestamp: block.timestamp,
            title:     title,
            ipfsCID:   ipfsCID,
            version:   version,
            expiry:    expiry,
            revoked:   false
        });

        _allHashes.push(docHash);
        _byAddress[msg.sender].push(docHash);

        emit DocumentCertified(docHash, msg.sender, block.timestamp, title);
    }

    /**
     * @notice Revoke a certified document.
     *         Only the original certifier or the contract owner may revoke.
     */
    function revoke(bytes32 docHash) external {
        Document storage doc = _registry[docHash];
        if (doc.timestamp == 0) revert NotFound(docHash);
        if (msg.sender != doc.certifier && msg.sender != owner) revert NotAuthorized();

        doc.revoked = true;
        emit DocumentRevoked(docHash, msg.sender, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Read functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Verify and retrieve a single document record.
     * @return doc  The full Document struct (revoked flag included).
     */
    function verify(bytes32 docHash)
        external
        view
        returns (Document memory doc)
    {
        if (_registry[docHash].timestamp == 0) revert NotFound(docHash);
        return _registry[docHash];
    }

    /**
     * @notice Check whether a hash exists without reverting.
     */
    function exists(bytes32 docHash) external view returns (bool) {
        return _registry[docHash].timestamp != 0;
    }

    /**
     * @notice Return the total number of certified documents.
     */
    function totalDocuments() external view returns (uint256) {
        return _allHashes.length;
    }

    /**
     * @notice Paginated list of ALL documents.
     * @param  offset  Starting index (0-based).
     * @param  limit   Maximum records to return (capped at 200).
     * @return docs    Array of Document structs.
     */
    function listDocuments(uint256 offset, uint256 limit)
        external
        view
        returns (Document[] memory docs)
    {
        uint256 total = _allHashes.length;
        if (offset >= total) return new Document[](0);

        uint256 cap = limit > 200 ? 200 : limit;
        uint256 end = offset + cap > total ? total : offset + cap;
        uint256 len = end - offset;

        docs = new Document[](len);
        for (uint256 i = 0; i < len; i++) {
            docs[i] = _registry[_allHashes[offset + i]];
        }
    }

    /**
     * @notice List all documents certified by a specific address.
     * @param  certifier  Address to filter by.
     * @param  offset     Starting index.
     * @param  limit      Max records (capped at 200).
     */
    function listByCertifier(address certifier, uint256 offset, uint256 limit)
        external
        view
        returns (Document[] memory docs)
    {
        bytes32[] storage hashes = _byAddress[certifier];
        uint256 total = hashes.length;
        if (offset >= total) return new Document[](0);

        uint256 cap = limit > 200 ? 200 : limit;
        uint256 end = offset + cap > total ? total : offset + cap;
        uint256 len = end - offset;

        docs = new Document[](len);
        for (uint256 i = 0; i < len; i++) {
            docs[i] = _registry[hashes[offset + i]];
        }
    }

    /**
     * @notice Return all hashes (raw) — useful for off-chain indexers.
     *         Gas-heavy for very large registries; use listDocuments for UI.
     */
    function allHashes() external view returns (bytes32[] memory) {
        return _allHashes;
    }
}
