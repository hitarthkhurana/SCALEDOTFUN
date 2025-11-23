// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockCUSD
 * @dev Mock cUSD ERC20 token for testing and development
 * This contract allows the owner to mint tokens to any address
 */
contract MockCUSD is ERC20, Ownable {
    uint8 private _decimals;

    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     * @param initialSupply Initial supply of tokens (in whole units, not wei)
     */
    constructor(uint256 initialSupply) ERC20("Celo Dollar", "cUSD") Ownable(msg.sender) {
        _decimals = 18;
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply * 10**uint256(_decimals));
        }
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint new tokens to a specified address
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint (in whole units, not wei)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount * 10**uint256(_decimals));
    }

    /**
     * @dev Mint new tokens in wei (smallest unit) to a specified address
     * Useful for precise control over token amounts
     * @param to The address that will receive the minted tokens
     * @param amountWei The amount of tokens to mint in wei
     */
    function mintWei(address to, uint256 amountWei) external onlyOwner {
        _mint(to, amountWei);
    }

    /**
     * @dev Burn tokens from the caller's account
     * @param amount The amount of tokens to burn (in whole units)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount * 10**uint256(_decimals));
    }

    /**
     * @dev Burn tokens in wei from the caller's account
     * @param amountWei The amount of tokens to burn in wei
     */
    function burnWei(uint256 amountWei) external {
        _burn(msg.sender, amountWei);
    }
}

