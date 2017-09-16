# Contributing guidelines

This is a monorepo, which means it's a single repository that contains multiple projects using `yarn workspaces`.

Make sure to check out our [Code of Conduct]() if you plan on participating in any way.


**Note: All changes committed to master will automatically publish packages to npm, and deploy websites to production.** Committing directly to master is therefor forbidden (and restricted by GitHub). All contributions to this repository must be made through pull requests that must be reviewed. Please try to follow the [branching strategy]() when creating new features.

All instructions assume using `yarn`, since the setup is configured around that. Make sure to use the latest version of `yarn` (v1+) since our setup relies on some of the more recent features, like workspaces.

If you're using [Visual Studio Code](), we recommend installing the extension for prettier, since we use that to format our scripts. If you do this, your editor will automatically format your files as soon as you save them. Either way, we have a `precommit` hook configured that also runs prettier in case you haven't.


## How should I help?

Check out our [Issue tracker]() and find an issue that has not been assigned yet. Make sure to consider priority labels and milestones.


## Getting started

### Clone repo & install dependencies

```shell
$ git clone https://github.com/svef/www.git
$ cd www
$ yarn
```

This should install all shared dependencies and bootstrap all the packages. Make sure to `git checkout` the branch you plan to work on, or create a new one.

### Branching strategy

Please try to follow this branching strategy, to make it simpler for everyone to realise what is what.

The pattern is essentially `{scope or type}/whatever-you-are-doing` (see [Scope]() and/or [Type]()).


### Development

For more details on developing each existing package, see their own README.

All projects should have npm scripts for at least `format`, `lint`, `dev`, `test` and `build` defined in their package.json.

#### Project wide scripts

You can run these scripts from the root of the project.

| Script                    | Description |
|---------------------------|-------------|
| `yarn run lint`           | Will run `yarn run lint` within all packages |
| `yarn run test`           | Will run tests |


## Pull requests

All pull requests must be squashed with a commit message matching v1.0.0-beta.1 of the [conventional commits specification]().

We have defined [code owners]() that will be required to review your pull request. Make sure to contact them IRL if the matter is urgent.

### Commit message format

The commit message for merging pull requests should be structured as follows:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

Example:

```text
feat(forms): New date picker

More elaborate description of this new feature.

BREAKING CHANGE: This replaces the old date picker
```

#### Type

Must be one of the following:

| Type | Description |
|---------|---------|
| **feat** | A new feature |
| **fix** | A bug fix |
| **perf** | A code change that improves performance |
| **docs** | Documentation only changes |
| **style** | Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc) |
| **refactor** | A code change that neither fixes a bug nor adds a feature |
| **test** | Adding missing or correcting existing tests |
| **chore** | Changes to the build process or auxiliary tools and libraries such as documentation generation |
| **revert** | If the commit reverts a previous commit, it should begin with `revert:`, followed by the header of the reverted commit. In the body it should say: `This reverts commit <hash>`., where the hash is the SHA of the commit being reverted. |

If the type is `feat`, `fix` or `perf`, it will appear in the generated changelog. However if there is any `BREAKING CHANGE` in the [footer](#footer), the commit will always appear in the changelog.

#### Scope

The scope could be anything specifying the context of the commit change.

For example: `build`, `utils`, `package-name`, etc…

#### Subject

The subject contains succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize first letter
- no dot (.) at the end

#### Body

Just as in the [**subject**](#subject), use the imperative, present tense: "change" not "changed" nor "changes". The body should include the motivation for the change and contrast this with previous behavior.

#### Footer

The footer should contain any information about **Breaking Changes**, and is also the place to [reference GitHub issues]() that this commit closes.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

## CI

> TODO: document what happens on CI when that has been configured.


<!--Make sure to not edit below this line, unless intentionally updating links 🙃 🙏 -->

[Issue tracker]: https://github.com/svef/www/issues
[Code of Conduct]: .github/CODE_OF_CONDUCT.md
[branching strategy]: #branching-strategy
[Scope]: #scope
[Type]: #type

[conventional commits specification]: http://conventionalcommits.org/
[code owners]: .github/CODEOWNERS

[Visual Studio Code]: https://code.visualstudio.com

[reference GitHub issues]: https://help.github.com/articles/closing-issues-via-commit-messages/
