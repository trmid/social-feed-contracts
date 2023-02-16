import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SocialFeed } from "../typechain-types";

describe("SocialFeed", function () {

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {

    // Contracts are deployed using the first signer/account by default
    const [owner, editor, ...otherAccounts] = await ethers.getSigners();
    const editors = [owner, editor];

    const SocialFeed = await ethers.getContractFactory("SocialFeed");
    const socialFeed = await SocialFeed.deploy(editors.map(x => x.address));

    return { socialFeed, owner, editors: editors, otherAccounts };
  }

  describe("Deployment", function () {
    
    it("Should set the right owner", async function () {
      const { socialFeed, owner } = await loadFixture(deploy);
      expect(await socialFeed.owner()).to.equal(owner.address);
    });

    it("Should assign the initial editor permissions", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      expect(editors.length).to.be.gt(0);
      for(const editor of editors) {
        expect(await socialFeed.isEditor(editor.address)).to.be.true;
      }
    });

    it("Should initialize with zero posts", async function() {
      const { socialFeed } = await loadFixture(deploy);
      expect(await socialFeed.numPosts()).to.equal(0);
    });
    
  });

  describe("post(...)", function() {

    it("Should allow an editor to post", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      await expect(socialFeed.connect(editors[1])["post(string)"]("link")).to.not.be.rejected;
      await expect(socialFeed.connect(editors[1])["post(string,string)"]("link","metadata")).to.not.be.rejected;
    });

    it("Should NOT allow an non-editor to post", async function() {
      const { socialFeed, otherAccounts } = await loadFixture(deploy);
      await expect(socialFeed.connect(otherAccounts[0])["post(string)"]("link")).to.be.rejectedWith("not editor");
      await expect(socialFeed.connect(otherAccounts[0])["post(string,string)"]("link","metadata")).to.be.rejectedWith("not editor");
    });

  });

  describe("removePost(...)", function() {

    it("Should allow an editor to remove a post", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      await socialFeed.connect(editors[1])["post(string)"]("link");
      await expect(socialFeed.connect(editors[1]).removePost(0)).to.not.be.rejected;
    });

    it("Should NOT allow an non-editor to remove a post", async function() {
      const { socialFeed, editors, otherAccounts } = await loadFixture(deploy);
      await socialFeed.connect(editors[1])["post(string)"]("link");
      await expect(socialFeed.connect(otherAccounts[0]).removePost(0)).to.be.rejectedWith("not editor");
    });

    it("Should NOT allow the removal of a post that dne", async function() {
      const { socialFeed } = await loadFixture(deploy);
      await expect(socialFeed.removePost(0)).to.be.rejectedWith("post dne");
    });

  });

  describe("numPosts()", function() {

    it("Should increment when a new post is added", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      const before = await socialFeed.numPosts();
      await socialFeed.connect(editors[1])["post(string)"]("link");
      const after = await socialFeed.numPosts();
      expect(after).to.eq(before.add(1));
    });

    it("Should decrement when a post is removed", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      await socialFeed.connect(editors[1])["post(string)"]("link");
      await socialFeed.connect(editors[1]).removePost(0);
      expect(await socialFeed.numPosts()).to.eq(0);
    });

  });

  describe("feed(...)", function() {

    const post10 = async (editor: any, socialFeed: SocialFeed) => {
      for(let i = 0; i < 10; i++) {
        if(i % 2 == 0) await socialFeed.connect(editor)["post(string)"](`link${i}`);
        else await socialFeed.connect(editor)["post(string,string)"](`link${i}`, `{"index":${i}}`);
      }
    };

    it("Should return the latest posts", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      await post10(editors[1], socialFeed);
      expect(await socialFeed.numPosts()).to.eq(10);
      const [uri, metadata, postId] = await socialFeed.feed(0, 10);
      expect(uri.length).to.eq(10);
      expect(postId[0]).eq(9);
      expect(uri[0]).eq('link9');
      expect(metadata[0]).eq('{"index":9}');
    });

    it("Should return with the correct offset", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      await post10(editors[1], socialFeed);
      expect(await socialFeed.numPosts()).to.eq(10);
      const [uri, metadata] = await socialFeed.feed(2, 3);
      expect(uri[0]).eq('link7');
      expect(metadata[0]).eq('{"index":7}');
    });

    it("Should reject if offset is too big", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      await post10(editors[1], socialFeed);
      expect(await socialFeed.numPosts()).to.eq(10);
      await expect(socialFeed.feed(11, 1)).to.be.rejectedWith("offset too big");
    });

    it("Should return an empty array if offset equals length", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      await post10(editors[1], socialFeed);
      expect(await socialFeed.numPosts()).to.eq(10);
      const [uri] = await socialFeed.feed(10, 1);
      expect(uri.length).to.equal(0);
    });

    it("Should return all posts if a depth of zero was passed", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      await post10(editors[1], socialFeed);
      expect(await socialFeed.numPosts()).to.eq(10);
      const [uri] = await socialFeed.feed(1, 10);
      expect(uri.length).to.equal(9);
    });

  });

  describe("addEditor(...)", function() {

    it("Should allow the contract owner to add an editor", async function() {
      const { socialFeed, owner, otherAccounts } = await loadFixture(deploy);
      await expect(socialFeed.connect(owner).addEditor(otherAccounts[0].address)).to.not.be.rejected;
      expect(await socialFeed.connect(owner).isEditor(otherAccounts[0].address)).to.be.true;
    });

    it("Should NOT allow an editor that is not owner to add an editor", async function() {
      const { socialFeed, owner, editors, otherAccounts } = await loadFixture(deploy);
      expect(editors[1].address).to.not.eq(owner.address);
      await expect(socialFeed.connect(editors[1]).addEditor(otherAccounts[0].address)).to.be.rejectedWith("Ownable: caller is not the owner");
    });

    it("Should reject if address is already an editor", async function() {
      const { socialFeed, owner, editors } = await loadFixture(deploy);
      await expect(socialFeed.connect(owner).addEditor(editors[1].address)).to.be.rejectedWith("already editor");
    });

  });

  describe("removeEditor(...)", function() {

    it("Should allow the contract owner to remove an editor", async function() {
      const { socialFeed, owner, editors } = await loadFixture(deploy);
      await expect(socialFeed.connect(owner).removeEditor(editors[1].address)).to.not.be.rejected;
      expect(await socialFeed.isEditor(editors[1].address)).to.be.false;
    });

    it("Should allow an editor to remove themselves", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      await expect(socialFeed.connect(editors[1]).removeEditor(editors[1].address)).to.not.be.rejected;
    });

    it("Should NOT allow an editor to remove another editor", async function() {
      const { socialFeed, editors } = await loadFixture(deploy);
      await expect(socialFeed.connect(editors[1]).removeEditor(editors[0].address)).to.be.rejectedWith("not owner or self");
    });

    it("Should reject if address is not an editor", async function() {
      const { socialFeed, owner, otherAccounts } = await loadFixture(deploy);
      await expect(socialFeed.connect(owner).removeEditor(otherAccounts[0].address)).to.be.rejectedWith("not editor");
    });

  });
});
