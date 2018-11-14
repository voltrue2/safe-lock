PHONY: help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

## Set default command of make to help, so that running make will output help texts
.DEFAULT_GOAL := help

.PHONY: init
init: ## Initial set up
	ln -fs ../../scripts/precommit .git/hooks/pre-commit

.PHONY: lint
lint: ## Executes eslint on lib/ and index.js
	./node_modules/eslint/bin/eslint.js lib/ || exit 1
	./node_modules/eslint/bin/eslint.js index.js || exit 1

.PHONY: test
test: ## Executes unit tests
	./node_modules/mocha/bin/mocha test/index.js --exit -s 10 -R spec -b --timeout 10000

