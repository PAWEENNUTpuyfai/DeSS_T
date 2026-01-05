
class SimulationLogger:
    def __init__(self, time_ctx):
        self.logs = []
        self.time_ctx = time_ctx

    def log(self, sim_time, component, message):
        self.logs.append({
            "time": self.time_ctx.sim_to_real(sim_time),
            "component": component,
            "message": message
        })

def add_log(env, component, message):
    env.logger.log(env.now(), component, message)
