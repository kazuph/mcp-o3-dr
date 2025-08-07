# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2025-08-07

### Added

- Automatic log file saving to `~/.cache/dr/` directory
- Real-time writing of search results to log files
- Log file path display at command execution start
- Markdown-formatted log files with date-time timestamps
- Protection against timeout data loss with persistent logging

## [0.1.0] - 2025-08-07

### Added

- stdin support for piping queries to dr command

## [0.0.5] - 2025-01-16

### Changed

- Updated tool description for better clarity
- Formatted code with Prettier for consistency

## [0.0.4] - 2025-01-12

### Added

- Configurable retry and timeout for OpenAI API (#6)
- MCP server badge (#1)
- MIT LICENSE file
- Release command setup
- Local setup configuration

### Thanks

- @wildgeece96 for adding configurable retry and timeout for OpenAI API (#6)
- @punkpeye for adding MCP server badge (#1)

[Unreleased]: https://github.com/yoshiko-pg/o3-search-mcp/compare/v0.0.5...HEAD
[0.0.5]: https://github.com/yoshiko-pg/o3-search-mcp/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/yoshiko-pg/o3-search-mcp/compare/v0.0.3...v0.0.4
