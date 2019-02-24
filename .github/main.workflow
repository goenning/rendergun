workflow "New workflow" {
  on = "push"
  resolves = ["build"]
}

action "build" {
  uses = "actions/docker/cli@master"
  args = "build -t goenning/rendergun ."
}
