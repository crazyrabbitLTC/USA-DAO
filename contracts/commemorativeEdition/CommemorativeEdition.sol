
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface INFTContract {
    function setTokenURI(uint256 tokenId, string calldata uri) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract CommemorativeEdition is Initializable, AccessControlUpgradeable, EIP712Upgradeable {
    INFTContract public nftContract;
    address public offChainSigner;
    uint256 public fee;

    bytes32 public constant FEE_SETTER_ROLE = keccak256("FEE_SETTER_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");
    bytes32 public constant URI_SIGNER_ROLE = keccak256("URI_SIGNER_ROLE");

    // EIP-712 TypeHash for the URI structure
    bytes32 public constant URI_TYPEHASH = keccak256("URI(string uri,uint256 tokenId)");

    event URIUpdated(uint256 indexed tokenId, string newURI, address indexed owner);
    event FeeUpdated(uint256 newFee);
    event OffChainSignerUpdated(address newSigner);
    event Withdrawal(address to, uint256 amount);

    error Unauthorized();
    error InvalidSignature();
    error InsufficientFee();
    error InsufficientBalance();
    error NoTokenOwned();
    error ContractPaused();

    function initialize(
        address _nftContractAddress,
        address _offChainSigner,
        uint256 _fee,
        address _defaultAdmin
    ) public initializer {
        __AccessControl_init();
        __EIP712_init("CommemorativeEdition", "1");

        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(FEE_SETTER_ROLE, _defaultAdmin);
        _grantRole(WITHDRAWER_ROLE, _defaultAdmin);
        _grantRole(URI_SIGNER_ROLE, _offChainSigner);

        nftContract = INFTContract(_nftContractAddress);
        offChainSigner = _offChainSigner;
        fee = _fee;
    }

    function updateURI(uint256 tokenId, string calldata uri, bytes calldata signature) external payable {
        if (msg.value < fee) revert InsufficientFee();

        // Construct the digest to verify
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            URI_TYPEHASH,
            keccak256(bytes(uri)),
            tokenId
        )));

        address signer = ECDSA.recover(digest, signature);
        require(signer == offChainSigner, "Invalid signature");

        require(nftContract.ownerOf(tokenId) == msg.sender, "Caller is not the token owner");

        nftContract.setTokenURI(tokenId, uri);
        emit URIUpdated(tokenId, uri, msg.sender);
    }


    function setFee(uint256 _fee) external {
        if (!hasRole(FEE_SETTER_ROLE, msg.sender)) revert Unauthorized();
        fee = _fee;
        emit FeeUpdated(_fee);
    }

    function setOffChainSigner(address _newSigner) external {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert Unauthorized();
        _revokeRole(URI_SIGNER_ROLE, offChainSigner);
        _grantRole(URI_SIGNER_ROLE, _newSigner);
        offChainSigner = _newSigner;
        emit OffChainSignerUpdated(_newSigner);
    }

    function withdraw(address to, uint256 amount) external {
        if (!hasRole(WITHDRAWER_ROLE, msg.sender)) revert Unauthorized();
        if(address(this).balance < amount) revert InsufficientBalance();
        (bool success, ) = to.call{ value: amount }(""); //todo: check if this is safe to do
        require(success, "Failed to withdraw");
        emit Withdrawal(to, amount);
    }

    // Ensure this contract can receive ETH.
    receive() external payable {}

    fallback() external payable {}
}
