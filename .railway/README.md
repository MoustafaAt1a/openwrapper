# Railway Infrastructure as Code (IaC)

This directory contains the Railway IaC definition for OpenWrapper.

## Prerequisites

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```
2. Authenticate:
   ```bash
   railway login
   ```
3. Link your project:
   ```bash
   railway link
   ```

## Commands

- **Preview changes**:
  ```bash
  railway config plan
  ```
- **Apply configuration**:
  ```bash
  railway config apply
  ```
