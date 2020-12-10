const SwanCrowdsale = artifacts.require("Crowdsale");
const ERC20 = artifacts.require("Swan");

var BN = require("bignumber.js");

const { time } = require("@openzeppelin/test-helpers");
const Web3 = require("web3");
// const web3 = new Web3('http:localhost:8545')

contract("Swan Crowdsale", accounts => {
  let erc20Instance = null;
  let crowdsaleInstance = null;

  before(async () => {
    erc20Instance = await ERC20.deployed();
    crowdsaleInstance = await SwanCrowdsale.deployed();
  });

  it("Crowdsale constructor should be initialized properly", async () => {
    const tokenAddress = await crowdsaleInstance.token();
    const ownerAddress = await crowdsaleInstance.owner();
    const walletAddress = await crowdsaleInstance.wallet();
    const ethPrice = await crowdsaleInstance.ethPrice();
    const currentStage = await crowdsaleInstance.getStage();

    assert.equal(tokenAddress, erc20Instance.address, "Addresses are not same");
    assert.equal(ownerAddress, accounts[0], "Owner address is not correct");
    assert.equal(walletAddress, accounts[0], "Wallet address is not correc");
    assert.equal(ethPrice.toString(), "10000", "EthPrice is not correc");
    assert.equal(currentStage, "CrowdSale Not Started", "Stage is not Correct");
  });

  it("Owner should be able to Transfer 30000000000000000000000 Swan Tokens to Crowdsale Contract",async()=>{
      const value = new BN(30000000000000000000000);
      await erc20Instance.transfer(crowdsaleInstance.address, value);
  })

  // WHITELISTING OF INVESTORS

  it("Owner should be able to Add WhiteListed Users", async () => {
    const checkApprovalForUser1_before = await crowdsaleInstance.whitelistedContributors(
      accounts[1]
    );
    const checkApprovalForUser2_before = await crowdsaleInstance.whitelistedContributors(
      accounts[2]
    );
    const checkApprovalForUser3_before = await crowdsaleInstance.whitelistedContributors(
      accounts[3]
    );

    const userArray = [accounts[1], accounts[2], accounts[3],accounts[4],accounts[5],accounts[6]];
    await crowdsaleInstance.authorizeKyc(userArray);

    const checkApprovalForUser1_after = await crowdsaleInstance.whitelistedContributors(
      accounts[1]
    );
    const checkApprovalForUser2_after = await crowdsaleInstance.whitelistedContributors(
      accounts[2]
    );
    const checkApprovalForUser3_after = await crowdsaleInstance.whitelistedContributors(
      accounts[3]
    );

    assert.equal(
      checkApprovalForUser1_before,
      false,
      "Before Approval is Wrong for User 1"
    );
    assert.equal(
      checkApprovalForUser2_before,
      false,
      "Before Approval is Wrong for User 2"
    );
    assert.equal(
      checkApprovalForUser3_before,
      false,
      "Before Approval is Wrong for User 3"
    );
    assert.equal(
      checkApprovalForUser1_after,
      true,
      "After Approval is Wrong for User 1"
    );
    assert.equal(
      checkApprovalForUser2_after,
      true,
      "After Approval is Wrong for User 2"
    );
    assert.equal(
      checkApprovalForUser3_after,
      true,
      "After Approval is Wrong for User 3"
    );
  });

  it("Only Owner should be able to Add WhiteListed Users", async () => {
    const userArray = [accounts[1], accounts[2], accounts[3]];
    try {
      await crowdsaleInstance.authorizeKyc(userArray);
    } catch (error) {
      const invalidOpcode = error.message.search("revert") >= 0;
      assert(invalidOpcode, "Expected revert, got '" + error + "' instead");
    }
  });

  // INITIATING PRIVATE SALE

  it("Owner should be able to Start A Private Sale", async () => {
    const bool_SaleStarted_before = await crowdsaleInstance.crowdSaleStarted();

    await crowdsaleInstance.startPrivateSale();
    const bool_SaleStarted_after = await crowdsaleInstance.crowdSaleStarted();
    const currentStage = await crowdsaleInstance.getStage();

    assert.equal(bool_SaleStarted_before, false, "Sale already started");
    assert.equal(bool_SaleStarted_after, true, "Sale didn't start");
    assert.equal(
      currentStage,
      "Private Sale Start",
      "Current Stage is not correct"
    );
  });

  //	TOKEN PURCHASE FUNCTIONS

  it("User should be able to Buy Swan Tokens at Private Sale Stage", async () => {
    const currentStage = await crowdsaleInstance.getStage();
    const user1_balance_before = await erc20Instance.balanceOf(accounts[1]);
    const boolCheck = await crowdsaleInstance.crowdSaleStarted();
    await crowdsaleInstance.buyTokens(accounts[1], {
      from: accounts[1],
      value: web3.utils.toWei("6", "Ether")
    });
    const user1_balance_after = await erc20Instance.balanceOf(accounts[1]);
    const totalWeiRaised = await crowdsaleInstance.getTotalWeiRaised();

    assert.equal(
      totalWeiRaised.toString(),
      "6000000000000000000",
      "Total Wei Raised is not correctly assigned"
    );
    assert.equal(currentStage, "Private Sale Start", "Current Stage is Wrong");
    assert.equal(boolCheck, true, "CrowdSale is not started");
    assert.equal(user1_balance_before.toString(), "0", "Balance is not zero");
    assert.equal(
      user1_balance_after.toString(),
      "750000",
      "User didn't receive Swan Token"
    );
  });

  it("User should NOT be able to Buy Swan Tokens if Contract is Paused", async () => {
    try {
      await crowdsaleInstance._pause({ from: accounts[0] });
      await crowdsaleInstance.buyTokens(accounts[1], {
        from: accounts[1],
        value: web3.utils.toWei("6", "Ether")
      });
    } catch (error) {
      const invalidOpcode = error.message.search("revert") >= 0;
      assert(invalidOpcode, "Expected revert, got '" + error + "' instead");
    }
    await crowdsaleInstance.restartSale();
  });

  it("User should NOT be able to Buy Swan Tokens if he/she is not WhiteListed Investor", async () => {
    try {
      await crowdsaleInstance.buyTokens(accounts[8], {
        from: accounts[8],
        value: web3.utils.toWei("6", "Ether")
      });
    } catch (error) {
      const invalidOpcode = error.message.search("revert") >= 0;
      assert(invalidOpcode, "Expected revert, got '" + error + "' instead");
    }
  });

  it("Private Sale Tokens should be updated", async () => {
    const privateTokenSold = await crowdsaleInstance.privateSaletokenSold();
    assert.equal(
      privateTokenSold.toString(),
      "60000",
      "Private Tokens Sold variable didn't update as expected"
    );
  });

  it("Owner should be able to End A Private Sale", async () => {
    const bool_SaleStarted_before = await crowdsaleInstance.crowdSaleStarted();

    await crowdsaleInstance.endPrivateSale();
    const bool_SaleStarted_after = await crowdsaleInstance.crowdSaleStarted();
    const currentStage = await crowdsaleInstance.getStage();

    assert.equal(bool_SaleStarted_before, true, "Sale already started");
    assert.equal(bool_SaleStarted_after, true, "Sale didn't start");
    assert.equal(
      currentStage,
      "Private Sale End",
      "Current Stage is not correct"
    );
  });

  it("Only Owner should be able to Start A Private Sale", async () => {
    try {
      await crowdsaleInstance.startPrivateSale();
    } catch (error) {
      const invalidOpcode = error.message.search("revert") >= 0;
      assert(invalidOpcode, "Expected revert, got '" + error + "' instead");
    }
  });

  it("Owner should be able to Pause the CrowdSale Contract", async () => {
    const bool_SaleStarted_before = await crowdsaleInstance.crowdSaleStarted();
    await crowdsaleInstance._pause();

    const bool_SaleStarted_after = await crowdsaleInstance.crowdSaleStarted();
    const currentStage = await crowdsaleInstance.getStage();
    const bool_pause = await crowdsaleInstance._Paused();

    assert.equal(currentStage, "paused", "Current Stage is not correct");
    assert.equal(bool_pause, true, "Pause is false");
    assert.equal(bool_SaleStarted_after, true, "Sale Started is False");
    assert.equal(bool_SaleStarted_before, true, "Sale Started is True");
  });

  it("Only Owner should be able to Pause the CrowdSale Contract", async () => {
    try {
      await crowdsaleInstance._pause();
    } catch (error) {
      const invalidOpcode = error.message.search("revert") >= 0;
      assert(invalidOpcode, "Expected revert, got '" + error + "' instead");
    }
  });

  it("Owner should be able to Restart the the CrowdSale", async () => {
    await crowdsaleInstance.restartSale();
    const currentStage = await crowdsaleInstance.getStage();
    const bool_pause = await crowdsaleInstance._Paused();

    assert.equal(
      currentStage,
      "Private Sale End",
      "Current Stage is not correct"
    );
    assert.equal(bool_pause, false, "Pause is true");
  });

  it("Only Owner should be able to Restart the the CrowdSale", async () => {
    try {
      await crowdsaleInstance.restartSale();
    } catch (error) {
      const invalidOpcode = error.message.search("revert") >= 0;
      assert(invalidOpcode, "Expected revert, got '" + error + "' instead");
    }
  });

  it("Owner should be able to Start Pre Sale", async () => {
    await crowdsaleInstance.startPreSale();

    const currentStage = await crowdsaleInstance.getStage();
    assert.equal(currentStage, "Presale Started", "Current Stage is not Right");
  });

  it("User should be able to Buy Swan Tokens at Presale Stage", async () => {
    const currentStage = await crowdsaleInstance.getStage();
    const user1_balance_before = await erc20Instance.balanceOf(accounts[2]);
    const boolCheck = await crowdsaleInstance.crowdSaleStarted();
    await crowdsaleInstance.buyTokens(accounts[2], {
      from: accounts[2],
      value: web3.utils.toWei("6", "Ether")
    });
    const user1_balance_after = await erc20Instance.balanceOf(accounts[2]);
    const totalWeiRaised = await crowdsaleInstance.getTotalWeiRaised();

    assert.equal(
      totalWeiRaised.toString(),
      "12000000000000000000",
      "Total Wei Raised is not correctly assigned"
    );
    assert.equal(currentStage, "Presale Started", "Current Stage is Wrong");
    assert.equal(boolCheck, true, "CrowdSale is not started");
    assert.equal(user1_balance_before.toString(), "0", "Balance is not zero");
    assert.equal(
      user1_balance_after.toString(),
      "720000",
      "User didn't receive Swan Token"
    );
  });


  it("Owner should be able to End Pre Sale", async () => {
    await crowdsaleInstance.endPreSale();

    const currentStage = await crowdsaleInstance.getStage();
    assert.equal(currentStage, "Presale Ended", "Current Stage is not Right");
  });

  it("Owner should be able to Start CrowdSaleRoundOne", async () => {
    await crowdsaleInstance.startCrowdSaleRoundOne();

    const currentStage = await crowdsaleInstance.getStage();
    assert.equal(
      currentStage,
      "CrowdSale Round One Started",
      "Current Stage is not Right"
    );
  });

  it("User should be able to Buy Swan Tokens at CrowdSaleRoundOne Stage", async () => {
    const currentStage = await crowdsaleInstance.getStage();
    const user1_balance_before = await erc20Instance.balanceOf(accounts[3]);
    const boolCheck = await crowdsaleInstance.crowdSaleStarted();
    await crowdsaleInstance.buyTokens(accounts[3], {
      from: accounts[3],
      value: web3.utils.toWei("6", "Ether")
    });
    const user1_balance_after = await erc20Instance.balanceOf(accounts[3]);
    const totalWeiRaised = await crowdsaleInstance.getTotalWeiRaised();

    assert.equal(
      totalWeiRaised.toString(),
      "18000000000000000000",
      "Total Wei Raised is not correctly assigned"
    );
    assert.equal(currentStage, "CrowdSale Round One Started", "Current Stage is Wrong");
    assert.equal(boolCheck, true, "CrowdSale is not started");
    assert.equal(user1_balance_before.toString(), "0", "Balance is not zero");
    assert.equal(
      user1_balance_after.toString(),
      "690000",
      "User didn't receive Swan Token"
    );
  });


  it("Owner should be able to End CrowdSaleRoundOne", async () => {
    await crowdsaleInstance.endCrowdSaleRoundOne();

    const currentStage = await crowdsaleInstance.getStage();
    assert.equal(
      currentStage,
      "CrowdSale Round One End",
      "Current Stage is not Right"
    );
  });

  it("Owner should be able to Start CrowdSaleRoundTwo", async () => {
    await crowdsaleInstance.startCrowdSaleRoundTwo();

    const currentStage = await crowdsaleInstance.getStage();
    assert.equal(
      currentStage,
      "CrowdSale Round Two Started",
      "Current Stage is not Right"
    );
  });

  it("User should be able to Buy Swan Tokens at CrowdSaleRoundTwo Stage", async () => {
    const currentStage = await crowdsaleInstance.getStage();
    const user1_balance_before = await erc20Instance.balanceOf(accounts[4]);
    const boolCheck = await crowdsaleInstance.crowdSaleStarted();
    await crowdsaleInstance.buyTokens(accounts[4], {
      from: accounts[4],
      value: web3.utils.toWei("6", "Ether")
    });
    const user1_balance_after = await erc20Instance.balanceOf(accounts[4]);
    const totalWeiRaised = await crowdsaleInstance.getTotalWeiRaised();

    assert.equal(
      totalWeiRaised.toString(),
      "24000000000000000000",
      "Total Wei Raised is not correctly assigned"
    );
    assert.equal(currentStage, "CrowdSale Round Two Started", "Current Stage is Wrong");
    assert.equal(boolCheck, true, "CrowdSale is not started");
    assert.equal(user1_balance_before.toString(), "0", "Balance is not zero");
    assert.equal(
      user1_balance_after.toString(),
      "660000",
      "User didn't receive Swan Token"
    );
  });

  it("Owner should be able to End CrowdSaleRoundTwo", async () => {
    await crowdsaleInstance.endCrowdSaleRoundTwo();

    const currentStage = await crowdsaleInstance.getStage();
    assert.equal(
      currentStage,
      "CrowdSale Round Two End",
      "Current Stage is not Right"
    );
  });

  it("Owner should be able to Start CrowdSaleRoundThree", async () => {
    await crowdsaleInstance.startCrowdSaleRoundThree();

    const currentStage = await crowdsaleInstance.getStage();
    assert.equal(
      currentStage,
      "CrowdSale Round Three Started",
      "Current Stage is not Right"
    );
  });

  it("User should be able to Buy Swan Tokens at CrowdSaleRoundThree Stage", async () => {
    const currentStage = await crowdsaleInstance.getStage();
    const user1_balance_before = await erc20Instance.balanceOf(accounts[5]);
    const boolCheck = await crowdsaleInstance.crowdSaleStarted();
    await crowdsaleInstance.buyTokens(accounts[5], {
      from: accounts[5],
      value: web3.utils.toWei("6", "Ether")
    });
    const user1_balance_after = await erc20Instance.balanceOf(accounts[5]);
    const totalWeiRaised = await crowdsaleInstance.getTotalWeiRaised();

    assert.equal(
      totalWeiRaised.toString(),
      "30000000000000000000",
      "Total Wei Raised is not correctly assigned"
    );
    assert.equal(currentStage, "CrowdSale Round Three Started", "Current Stage is Wrong");
    assert.equal(boolCheck, true, "CrowdSale is not started");
    assert.equal(user1_balance_before.toString(), "0", "Balance is not zero");
    assert.equal(
      user1_balance_after.toString(),
      "630000",
      "User didn't receive Swan Token"
    );
  });

  it("Owner should be able to End CrowdSaleRoundThree", async () => {
    await crowdsaleInstance.endCrowdSaleRoundThree();

    const currentStage = await crowdsaleInstance.getStage();
    assert.equal(
      currentStage,
      "CrowdSale Round Three End",
      "Current Stage is not Right"
    );
  });

  it("Owner should be able to Start CrowdSaleRoundFour", async () => {
    await crowdsaleInstance.startCrowdSaleRoundFour();

    const currentStage = await crowdsaleInstance.getStage();
    assert.equal(
      currentStage,
      "CrowdSale Round Four Started",
      "Current Stage is not Right"
    );
  });

  it("User should be able to Buy Swan Tokens at CrowdSaleRoundThree Stage", async () => {
    const currentStage = await crowdsaleInstance.getStage();
    const user1_balance_before = await erc20Instance.balanceOf(accounts[6]);
    const boolCheck = await crowdsaleInstance.crowdSaleStarted();
    await crowdsaleInstance.buyTokens(accounts[6], {
      from: accounts[6],
      value: web3.utils.toWei("6", "Ether")
    });
    const user1_balance_after = await erc20Instance.balanceOf(accounts[6]);
    const totalWeiRaised = await crowdsaleInstance.getTotalWeiRaised();

    assert.equal(
      totalWeiRaised.toString(),
      "36000000000000000000",
      "Total Wei Raised is not correctly assigned"
    );
    assert.equal(currentStage, "CrowdSale Round Four Started", "Current Stage is Wrong");
    assert.equal(boolCheck, true, "CrowdSale is not started");
    assert.equal(user1_balance_before.toString(), "0", "Balance is not zero");
    assert.equal(
      user1_balance_after.toString(),
      "60000",
      "User didn't receive Swan Token"
    );
  });
  it("Owner should be able to End CrowdSaleRoundFour", async () => {
    await crowdsaleInstance.endCrowdSaleRoundFour();

    const currentStage = await crowdsaleInstance.getStage();
    assert.equal(
      currentStage,
      "CrowdSale Round Four End",
      "Current Stage is not Right"
    );
  });

  // Finalizing the SALE

  it("Remaing Swan Tokens should be refundable to Owner", async () => {
    const contractBalance_before = await erc20Instance.balanceOf(
      crowdsaleInstance.address
    );
    const ownerBalance_before = await erc20Instance.balanceOf(accounts[0]);

    await crowdsaleInstance.finalizeSale();

    const contractBalance_after = await erc20Instance.balanceOf(
      crowdsaleInstance.address
    );
    const ownerBalance_after = await erc20Instance.balanceOf(accounts[0]);

    assert.equal(
      contractBalance_before.toString(),
      "29999999999999996490000",
      "Contract Balance is not right"
    );
    assert.equal(
      ownerBalance_before.toString(),
      "49999970000000000000000000000",
      "Owner Balance is not right"
    );
    assert.equal(
      contractBalance_after.toString(),
      "0",
      "Contract After Balance is not right"
    );
    assert.equal(
      ownerBalance_after.toString(),
      "49999999999999999999996490000",
      "Owner AfterBalance is not right"
    );
  });

  it("Only Owner should be able to Finalize the Sale", async () => {
    try {
      await crowdsaleInstance.finalizeSale();
    } catch (error) {
      const invalidOpcode = error.message.search("revert") >= 0;
      assert(invalidOpcode, "Expected revert, got '" + error + "' instead");
    }
  });

  // Owner Setting the Ether Price
  it("Owner should be able to Set Ether Price", async () => {
    const currentPrice_before = await crowdsaleInstance.ethPrice();
    await crowdsaleInstance.setEthPriceInCents(10000);
    const currentPrice_after = await crowdsaleInstance.ethPrice();

    assert.equal(
      currentPrice_before.toString(),
      "10000",
      "Before Price is not correct"
    );
    assert.equal(
      currentPrice_after.toString(),
      "10000",
      "After Price is not right"
    );
  });

  it("Only Owner should be able to Set Ether Price", async () => {
    try {
      await crowdsaleInstance.setEthPriceInCents(10000);
    } catch (error) {
      const invalidOpcode = error.message.search("revert") >= 0;
      assert(invalidOpcode, "Expected revert, got '" + error + "' instead");
    }
  });
});
