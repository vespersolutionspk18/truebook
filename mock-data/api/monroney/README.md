# Mock Monroney API

This directory contains mock API endpoint implementations for the Monroney label feature.

## Structure

- `[vin].ts` - Mock API endpoint for fetching Monroney labels by VIN

## Usage

These mock implementations simulate the behavior of the actual API endpoints during development.
The actual PDF files remain in the `/public/monroneys/` directory.

## Implementation

The mock endpoints should mirror the behavior of the production API while using the local PDF files
stored in the public directory. This allows for seamless testing during development without
requiring external API access.

## Note

Ensure that the mock implementations maintain the same interface as the production API
to allow for easy switching between development and production environments.