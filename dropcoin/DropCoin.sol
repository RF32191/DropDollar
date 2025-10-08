// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DropCoin - A Dynamic Value Appreciation Token
 * @dev ERC-20 token with value appreciation mechanism based on holder count and usage
 * 
 * Tokenomics:
 * - Total Supply: 110,000,000 DROP
 * - Circulating Supply: 100,000,000 DROP (available for purchase)
 * - Owner Reserve: 10,000,000 DROP (stays in owner wallet)
 * - Initial Price: $1.00 USD (automatically calculated in ETH)
 * - Value increases with more holders and usage
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract DropCoin is IERC20 {
    string public constant name = "Drop Coin";
    string public constant symbol = "DROP";
    uint8 public constant decimals = 18;
    
    // Total supply: 110 million tokens
    uint256 private constant TOTAL_SUPPLY = 110_000_000 * 10**decimals;
    uint256 private constant CIRCULATING_SUPPLY = 100_000_000 * 10**decimals;
    uint256 private constant OWNER_RESERVE = 10_000_000 * 10**decimals;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => bool) private _isHolder;
    
    address public owner;
    uint256 private _totalSupply;
    uint256 public holderCount;
    uint256 public totalTransactions;
    uint256 public basePrice; // Base price in wei (ETH)
    uint256 public priceMultiplier; // Dynamic multiplier based on usage
    
    // Events for value appreciation tracking
    event HolderAdded(address indexed holder, uint256 newHolderCount);
    event HolderRemoved(address indexed holder, uint256 newHolderCount);
    event PriceUpdated(uint256 newPrice, uint256 holderCount, uint256 transactions);
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 price);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor(uint256 _basePrice) {
        owner = msg.sender;
        _totalSupply = TOTAL_SUPPLY;
        basePrice = _basePrice; // Set initial base price (equivalent to $1 USD in wei)
        priceMultiplier = 1000; // Start with 1.000 multiplier (scaled by 1000)
        
        // Mint owner reserve to owner's wallet
        _balances[owner] = OWNER_RESERVE;
        _isHolder[owner] = true;
        holderCount = 1;
        
        // Mint circulating supply to contract for sale
        _balances[address(this)] = CIRCULATING_SUPPLY;
        
        emit Transfer(address(0), owner, OWNER_RESERVE);
        emit Transfer(address(0), address(this), CIRCULATING_SUPPLY);
    }
    
    // ERC-20 Standard Functions
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }
    
    function allowance(address tokenOwner, address spender) public view override returns (uint256) {
        return _allowances[tokenOwner][spender];
    }
    
    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, currentAllowance - amount);
        
        return true;
    }
    
    // Internal transfer function with holder tracking
    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(_balances[sender] >= amount, "ERC20: transfer amount exceeds balance");
        
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        
        // Update holder status
        _updateHolderStatus(sender);
        _updateHolderStatus(recipient);
        
        // Increment transaction count and update price
        totalTransactions++;
        _updatePrice();
        
        emit Transfer(sender, recipient, amount);
    }
    
    function _approve(address tokenOwner, address spender, uint256 amount) internal {
        require(tokenOwner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        
        _allowances[tokenOwner][spender] = amount;
        emit Approval(tokenOwner, spender, amount);
    }
    
    // Holder tracking functions
    function _updateHolderStatus(address account) internal {
        if (account == address(this) || account == address(0)) return;
        
        bool wasHolder = _isHolder[account];
        bool isCurrentlyHolder = _balances[account] > 0;
        
        if (!wasHolder && isCurrentlyHolder) {
            _isHolder[account] = true;
            holderCount++;
            emit HolderAdded(account, holderCount);
        } else if (wasHolder && !isCurrentlyHolder) {
            _isHolder[account] = false;
            holderCount--;
            emit HolderRemoved(account, holderCount);
        }
    }
    
    // Dynamic pricing mechanism
    function _updatePrice() internal {
        // Price increases with more holders and transactions
        // Formula: basePrice * (1 + (holderCount * 0.001) + (totalTransactions * 0.0001))
        uint256 holderBonus = holderCount * 1; // 0.1% per holder (scaled by 1000)
        uint256 transactionBonus = totalTransactions / 10; // 0.01% per transaction (scaled by 1000)
        
        priceMultiplier = 1000 + holderBonus + transactionBonus;
        
        emit PriceUpdated(getCurrentPrice(), holderCount, totalTransactions);
    }
    
    // Public function to get current token price
    function getCurrentPrice() public view returns (uint256) {
        return (basePrice * priceMultiplier) / 1000;
    }
    
    // Function to purchase tokens from the contract
    function purchaseTokens(uint256 tokenAmount) public payable {
        require(tokenAmount > 0, "Token amount must be greater than 0");
        require(_balances[address(this)] >= tokenAmount, "Not enough tokens available for sale");
        
        uint256 totalCost = (getCurrentPrice() * tokenAmount) / 10**decimals;
        require(msg.value >= totalCost, "Insufficient ETH sent");
        
        // Transfer tokens to buyer
        _balances[address(this)] -= tokenAmount;
        _balances[msg.sender] += tokenAmount;
        
        // Update holder status
        _updateHolderStatus(msg.sender);
        
        // Increment transaction count and update price
        totalTransactions++;
        _updatePrice();
        
        // Refund excess ETH
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit Transfer(address(this), msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, tokenAmount, getCurrentPrice());
    }
    
    // Function to calculate cost for purchasing tokens
    function calculatePurchaseCost(uint256 tokenAmount) public view returns (uint256) {
        return (getCurrentPrice() * tokenAmount) / 10**decimals;
    }
    
    // Owner functions
    function withdrawETH() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function updateBasePrice(uint256 newBasePrice) public onlyOwner {
        basePrice = newBasePrice;
        _updatePrice();
    }
    
    function getContractStats() public view returns (
        uint256 _holderCount,
        uint256 _totalTransactions,
        uint256 _currentPrice,
        uint256 _availableForSale,
        uint256 _contractETHBalance
    ) {
        return (
            holderCount,
            totalTransactions,
            getCurrentPrice(),
            _balances[address(this)],
            address(this).balance
        );
    }
    
    // Function to check if an address is a holder
    function isHolder(address account) public view returns (bool) {
        return _isHolder[account];
    }
    
    // Emergency functions (only owner)
    function emergencyPause() public onlyOwner {
        // In a production environment, you might want to implement a pause mechanism
        // For now, this is a placeholder for emergency functionality
    }
    
    // Function to transfer ownership
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}