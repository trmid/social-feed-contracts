// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Social Feed Contract
/// @author trmid.eth
/// @notice Allows the owner to manage a social feed that can be queried by clients
contract SocialFeed is Ownable {

    // Variables:
    uint64 _nextId;
    uint64 _numDeleted;
    mapping(uint64 => string) _postUri;
    mapping(uint64 => string) _postMetadata;
    mapping(address => bool) _isEditor;

    // Events:
    event Post(uint64 indexed id, string uri);
    event PostWithMetadata(uint64 indexed id, string uri, string metadata);
    event RemovePost(uint64 indexed id);
    event AddEditor(address indexed editor);
    event RemoveEditor(address indexed editor, address remover);

    /// @param editors The initial editors of the contract
    constructor(address[] memory editors) Ownable() {
        for(uint8 i = 0; i < editors.length; i++) {
            addEditor(editors[i]);
        }
    }

    /// @return uint64 current number of posts
    function numPosts() external view  returns(uint64) {
        return _nextId - _numDeleted;
    }

    /// @dev Not gas optimized! Designed for read-only use!
    /// @notice Fetches a list of recent posts (posts that have been removed will be empty strings)
    /// @param offset The amount of posts to skip (starting at the most recent)
    /// @param depth How many posts to return in the results. Use '0' to return all posts
    /// @return (string[] uri, string[] metadata, uint64[] postId)  
    function feed(uint64 offset, uint64 depth) external view returns(string[] memory, string[] memory, uint64[] memory) {
        require(_nextId >= offset, "offset too big");
        if(depth == 0 || depth > _nextId - offset) depth = _nextId - offset;
        string[] memory uri = new string[](depth);
        string[] memory metadata = new string[](depth);
        uint64[] memory postId = new uint64[](depth);
        if(depth == 0) return(uri, metadata, postId);
        for(uint64 index; index < depth; index++) {
            uint64 id = _nextId - index - offset - 1;
            uri[index] = _postUri[id];
            metadata[index] = _postMetadata[id];
            postId[index] = id;
        }
        return(uri, metadata, postId);
    }

    /// @notice Checks if an address is an editor
    /// @param editor The address to check
    /// @return bool
    function isEditor(address editor) public view returns(bool) {
        return _isEditor[editor];
    }

    /// @notice (Only Owner) Adds a new address as an editor
    /// @param editor The address to add
    function addEditor(address editor) public onlyOwner {
        require(!_isEditor[editor], "already editor");
        _isEditor[editor] = true;
        emit AddEditor(editor);
    }

    /// @notice (Only Owner or Self) Removes editor permissions from an address
    /// @param editor The address to remove permissions from
    /// @dev Rejects if address is not editor
    function removeEditor(address editor) public {
        require(_msgSender() == owner() || _msgSender() == editor, "not owner or self");
        require(_isEditor[editor], "not editor");
        delete _isEditor[editor];
        emit RemoveEditor(editor, _msgSender());
    }

    /// @notice (Only Editor) Pushes a post to the feed with only a URI
    function post(string calldata uri) external {
        post(uri, "");
    }

    /// @notice (Only Editor) Pushes a post to the feed with a URI and Metadata
    function post(string calldata uri, string memory metadata) public {
        require(_isEditor[_msgSender()], "not editor");
        _postUri[_nextId] = uri;
        if(bytes(metadata).length > 0) {
            _postMetadata[_nextId] = metadata;
            emit PostWithMetadata(_nextId, uri, metadata);
        } else {
            emit Post(_nextId, uri);
        }
        ++_nextId;
    }

    /// @notice (Only Editor) Removes the post with the given ID
    function removePost(uint64 id) external {
        require(_isEditor[_msgSender()], "not editor");
        require(bytes(_postUri[id]).length > 0, "post dne");
        delete _postUri[id];
        delete _postMetadata[id];
        ++_numDeleted;
        emit RemovePost(id);
    }
}
