workflow "CI" {
  on = "push"
  resolves = [
    "lint",
    "new-action",
  ]
}

action "test" {
  uses = "Borales/actions-yarn@1.1.0"
  runs = "run test"
}

action "lint" {
  uses = "Borales/actions-yarn@1.1.0"
  runs = "run lint"
}

action "Filters for GitHub Actions" {
  uses = "actions/bin/filter@3c0b4f0e63ea54ea5df2914b4fabf383368cd0da"
  args = "branch master"
}

action "Filters for GitHub Actions-1" {
  uses = "actions/bin/filter@3c0b4f0e63ea54ea5df2914b4fabf383368cd0da"
  needs = ["test", "lint"]
  args = "branch master"
}

action "new-action" {
  uses = "owner/repo/path@ref"
  needs = ["Filters for GitHub Actions-1"]
}
