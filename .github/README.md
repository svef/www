# SVEF websites

[![Build Status](https://img.shields.io/travis/svef/www/master.svg?style=flat&label=travis%20status)](https://travis-ci.org/svef/www)

This is a [lerna]() monorepo (single repository for multiple projects) for all things related to the websites SVEF maintains.

Make sure to check out our [Code of Conduct]() if you plan on participating in any way.


## What's in here?

As of now it is configured for two purposes; npm packages and websites.


### [`components`]()

This package is published as `@svef/components`, and is (as the name might suggest) a library of react components for web related projects.

The project should be structured as so:

```
┌── components
│   └── ComponentName
│       ├── assets/
│       ├── index.js
│       ├── index.story.js
│       └── index.test.js
│   └── …etc
├── package.json
└── README.md
```


### `websites/*`

These are actual websites meant to be based on the domains owned by SVEF. As of now these include `svef.is`, `vefverdlaun.is` and `iceweb.is`.


## I want to help! How?

Check out our [Contribution guidelines]()!

Make sure to check out our [Code of Conduct]() as well.


<!--Make sure to not edit below this line, unless intentionally updating links 🙃 🙏 -->

[`components`]: components/
[lerna]: https://github.com/lerna/lerna
[Contribution guidelines]: .github/CONTRIBUTING.md
[Code of Conduct]: .github/CODE_OF_CONDUCT.md
