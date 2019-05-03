workflow "CI" {
  on = "push"
  resolves = [
    "only-master",
  ]
}

action "install" {
  uses = "Borales/actions-yarn@1.1.0"
  args = "install"
}

action "test" {
  uses = "Borales/actions-yarn@1.1.0"
  args = "run test"
  needs = ["install"]
}

action "lint" {
  uses = "Borales/actions-yarn@1.1.0"
  args = "run lint"
  needs = ["install"]
}

action "only-master" {
  uses = "actions/bin/filter@3c0b4f0e63ea54ea5df2914b4fabf383368cd0da"
  needs = ["test", "lint"]
  args = "branch master"
}
