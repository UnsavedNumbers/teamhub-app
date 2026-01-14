---
name: Windows Supabase CLI Setup Guide
overview: Create a Windows-specific Supabase CLI setup instruction file in plain text console format, including Windows installation methods (Scoop, Chocolatey, npm), PowerShell commands, and Windows path examples.
todos:
  - id: create-setup-file
    content: Create SUPABASE_CLI_SETUP_WINDOWS.txt with Windows-specific Supabase CLI instructions in plain text console format
    status: pending
---

# Windows Supabase CLI Setup Instructions

## Overview

Create a plain text file `SUPABASE_CLI_SETUP_WINDOWS.txt` in the project root with Windows-specific instructions for setting up and using the Supabase CLI.

## Implementation Details

### File to Create

- **File**: `SUPABASE_CLI_SETUP_WINDOWS.txt`
- **Location**: Project root (`C:\YouthSports.team\web\`)
- **Format**: Plain text with console/terminal formatting (ASCII borders, monospace-friendly)

### Content Structure

1. **Header**: ASCII art border with title
2. **Prerequisites Check Section**: Verify npm/Node.js installation before proceeding
3. **Installation Section**: Windows-specific methods with troubleshooting per method

- npm (works on Windows) - with verification command
- Scoop (Windows package manager) - with installation check
- Chocolatey (Windows package manager) - with installation check
- Manual download option as fallback

4. **PowerShell Execution Policy Section**: How to check and fix if needed
5. **Linking Section**: Windows path examples with quotes for paths containing spaces

- Detailed step-by-step to find project reference ID
- Alternative methods to locate project reference ID
- Database password: how to find in dashboard AND how to reset

6. **Migration Section**: 

- Emphasize running migrations in order (001-016)
- Use `supabase db push` as primary method (runs all automatically)
- Show relative path examples from project root
- Note about working directory requirement

7. **Verification Section**: Commands to check setup
8. **Environment Variables Section**: 

- Exact file location: `C:\YouthSports.team\web\.env`
- Complete template with placeholder values
- Verification command to test env vars are loaded

9. **Troubleshooting Section**: Windows-specific issues with solutions
10. **Common Error Messages**: Windows-specific error patterns and fixes

### Windows-Specific Considerations

- Use Windows-style paths: `C:\YouthSports.team\web`
- Always quote paths in examples to handle spaces: `"C:\YouthSports.team\web"`
- PowerShell as default (modern Windows standard)
- Note CMD differences only where critical (e.g., variable syntax)
- Windows line endings (CRLF) considerations
- Path separator usage in commands
- Windows-specific error messages

### Risk Mitigation Strategies

The guide will proactively address the top 10 most likely technical issues:

1. **Path Issues with Spaces/Special Characters**

- Always quote paths in all command examples
- Show examples with spaces in directory names
- Use relative paths where possible

2. **PowerShell vs CMD Differences**

- Default to PowerShell (Windows 10/11 standard)
- Note CMD syntax differences only where critical
- Provide PowerShell execution policy fix instructions

3. **npm Not Installed or Not in PATH**

- Prerequisites check section at the start
- Verification command: `npm --version`
- Link to Node.js installation if missing
- Alternative installation methods (Scoop, Chocolatey)

4. **Supabase CLI Installation Fails**

- Multiple installation methods with troubleshooting per method
- Verification command after each installation: `supabase --version`
- Common error messages and solutions
- Fallback to manual download

5. **Project Reference ID Confusion**

- Detailed step-by-step with specific menu navigation
- Alternative: Show in project URL format
- Alternative: Show in API settings
- Visual indicators (e.g., "looks like: abcdefghijklmnop")

6. **Database Password Forgotten**

- Instructions to find password in dashboard (Settings → Database)
- Instructions to reset password if needed
- Note that password is set during project creation

7. **Migration Order Issues**

- Strong emphasis on running in order (001-016)
- Use `supabase db push` as primary method (handles order automatically)
- Warning about running migrations individually
- Show how to check migration status

8. **Environment Variables Not Loading**

- Exact file location: `C:\YouthSports.team\web\.env` (project root)
- Complete template with both required variables
- Verification: Show how to test in PowerShell
- Note: Restart dev server after creating/updating .env
- Common mistake: wrong file location or typos

9. **PowerShell Execution Policy Restrictions**

- Check command: `Get-ExecutionPolicy`
- Fix command: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Explanation of why it's needed
- Alternative: Run PowerShell as Administrator if needed

10. **Migration File Path Issues**

- Use relative paths from project root: `supabase/migrations/001_organizations.sql`
- Emphasize: Must run commands from project root directory
- Show how to verify current directory: `pwd` (PowerShell) or `cd` (CMD)
- Show how to navigate to project root if needed

### Formatting Style

- Use ASCII borders (`===`, `---`) for sections
- Use `$` prefix for commands (standard console convention)
- Plain text, no markdown syntax
- Monospace-friendly formatting
- Clear visual hierarchy with borders and spacing

## Files Modified

- New file: `SUPABASE_CLI_SETUP_WINDOWS.txt`

## Testing

After creation, verify:

- File is readable in Notepad/VS Code
- Commands are copy-pasteable (no markdown formatting)
- Windows paths are correct and quoted where needed
- Formatting is clear and readable
- All 16 migration files are referenced correctly
- Environment variable template matches project requirements (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Prerequisites section appears before installation
- Troubleshooting section addresses all 10 identified risks