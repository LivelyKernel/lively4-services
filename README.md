# lively4-services [![Build Status][ticon]][travis]

Development, deployment, and run-time programming of stand-alone services from Lively4.

[![Deploy][hicon]][heroku-deploy] [![Deploy to Bluemix][bicon]][bluemix-deploy]

## How to use

1. Deploy your own lively4-services instance (e.g. on [Heroku][heroku-deploy]).
2. Open the `Services` tool in Lively4. It should ask you to provide your
instance's URL (e.g. `https://my-instance.herokuapp.com/`) if you have not used
the tool before. This will also mount the instance's services repository to
`/services`.
3. You can now use the fork icon to clone a project from GitHub and you can
develop your services using the code icon.
4. Finally, deploy a service by clicking on the plus icon and by selecting your
service's entry point.

In order to debug a service, click the bug icon.
For switching to a different instance, click on the cog icon.

#### Port forwarding

lively4-services has builtin port forwarding capabilities with support for
`http`,`https`, `ws`, and `wss`. This allows you to access your running services
through a single port, the same one that the `Services` tool uses to communicate
with lively4-services' API. Here is how to use it:

```bash
https://my-instance.herokuapp.com/port/<LocalPortOfYourService>/
```

[ticon]: https://travis-ci.org/LivelyKernel/lively4-services.svg?branch=master
[hicon]: https://www.herokucdn.com/deploy/button.svg
[bicon]: https://bluemix.net/deploy/button.png
[travis]: https://travis-ci.org/LivelyKernel/lively4-services
[heroku-deploy]: https://heroku.com/deploy?template=https://github.com/LivelyKernel/lively4-services/tree/master
[bluemix-deploy]: https://bluemix.net/deploy?repository=https://github.com/LivelyKernel/lively4-services