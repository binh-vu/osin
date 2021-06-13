# osin

There are existing systems (e.g., neptune.ai, sacred) helping you organize, log data of your experiments. However, typically, the tasks of running the experiments are your responsible to bear. If you update your code and need to re-run your experiments, you may want to delete previous runs, which would be painful to have to do manually many times.

We rethink the experimenting process. Why don't we start with specifying the designed report (e.g., charts) and how to run/query to get the numbers to fill the report? This would free ones from manually starting/running the experiments and managing the experiment data. `osin` is a tool that helps you to achieve that goal.

Note: this tool is expected to use locally or inside VPN network as it doesn't provide any protection against attackers.

## Quick start

You will start by designing the output that your experiments will produce. For example:

```yaml
schema:
  run_id:
  method:
  precision:
  recall:
  f1:
```


