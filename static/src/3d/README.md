# WebGL Wrapper

Simple helpers for WebGL. This repository exists to share code
between my own projects. Used by https://github.com/davidje13/Chance

## Install dependency

```bash
npm install --save git+https://github.com/davidje13/webgl-wrapper.git#semver:^1.0.0
```

## Or install as Git submodule

This approach is not recommended, but submodules are
[supported by GitHub pages](https://help.github.com/en/github/working-with-github-pages/using-submodules-with-github-pages),
so it can be useful for managing dependencies without a build step.
Note that [managing version updates can be tricky](https://medium.com/@porteneuve/mastering-git-submodules-34c65e940407).

```bash
git submodule add https://github.com/davidje13/webgl-wrapper.git my-directory
```

After creating submodules, all collaborators will need to clone with the
`--recursive` flag, or run the following after cloning:

```bash
git submodule update --init --recursive
```

It is also necessary to run the above after `pull`ing if a submodule has changed.

### Recommendations if using submodules

Show commit messages for sub-repos when running `git status` if the referenced commit has changed:

```bash
git config --global status.submoduleSummary true
```

Same for using `git diff`:

```bash
git config --global diff.submodule log
```
