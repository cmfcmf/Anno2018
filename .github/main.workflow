workflow "CI" {
  on = "push"
  resolves = [
    "lint",
    "test",
    "deploy",
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

action "build" {
  uses = "Borales/actions-yarn@1.1.0"
  args = "run build"
  needs = ["install"]
}

action "only-master" {
  uses = "actions/bin/filter@3c0b4f0e63ea54ea5df2914b4fabf383368cd0da"
  args = "branch master"
}

action "deploy" {
  uses = "maxheld83/ghpages@v0.2.1"
  env = {
    BUILD_DIR = "dist/"
  }
  needs = ["only-master", "test", "build"]
  secrets = ["GH_PAT"]
}
