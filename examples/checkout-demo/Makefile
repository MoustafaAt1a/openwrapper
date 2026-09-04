ifeq ($(OS),Windows_NT)
  SHELL := cmd.exe
  .SHELLFLAGS := /c
endif

.PHONY: help start start-all start-ts start-php start-dotnet test-all test-cli-ts test-cli-php test-cli-dotnet check verify install

help:
	@echo OpenWrapper Multi-SDK Checkout Demo
	@echo ===================================
	@echo   make start            - Start ALL 3 servers concurrently (:4000, :4001, :4002)
	@echo   make start-all        - Start ALL 3 servers concurrently (:4000, :4001, :4002)
	@echo   make start-ts         - Run TypeScript server only on port 4000
	@echo   make start-php        - Run PHP 8 server only on port 4001
	@echo   make start-dotnet     - Run .NET 8 server only on port 4002
	@echo   make test-all         - Run multi-rail CLI tests across all 3 SDKs
	@echo   make test-cli-ts      - Run TypeScript CLI multi-rail test
	@echo   make test-cli-php     - Run PHP CLI multi-rail test
	@echo   make test-cli-dotnet  - Run .NET CLI multi-rail test
	@echo   make check            - Syntax and build verification for all SDKs
	@echo   make verify           - Run end-to-end API test suite
	@echo   make install          - Install and restore dependencies

start: start-all

start-all:
	node scripts/start-all.mjs

start-ts:
	cd typescript && node server.js

start-php:
	php -S 0.0.0.0:4001 php/server.php

start-dotnet:
	dotnet run --project dotnet/CheckoutDemo.csproj

test-all: test-cli-ts test-cli-php test-cli-dotnet

test-cli-ts:
	cd typescript && node test-cli.js

test-cli-php:
	php php/test-cli.php

test-cli-dotnet:
	dotnet run --project dotnet/CheckoutDemo.csproj -- --cli

check:
	node --check typescript/server.js
	node --check typescript/test-cli.js
	node --check public/app.js
	php -l php/server.php
	php -l php/test-cli.php
	dotnet build dotnet/CheckoutDemo.csproj

verify:
	node scripts/verify-api.mjs

install:
	cd typescript && bun install
	dotnet restore dotnet/CheckoutDemo.csproj
