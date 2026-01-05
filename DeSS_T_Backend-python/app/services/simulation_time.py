def parse_hour_min(t: str) -> int:
    h, m = map(int, t.replace(":", ".").split("."))
    return h * 60 + m

class TimeContext:
    def __init__(self, time_period: str, slot_length: int):
        start, end = time_period.split("-")
        self.real_start = parse_hour_min(start)
        self.real_end = parse_hour_min(end)
        self.slot_length = slot_length

        self.sim_duration = self.real_end - self.real_start
        self.num_slots = self.sim_duration // slot_length

    def to_sim(self, real_minute: int) -> int:
        return real_minute - self.real_start

    def sim_to_real(self, sim_time: float) -> str:
        total = int(sim_time) + self.real_start
        return f"{total//60:02d}:{total%60:02d}"

    def slot_index(self, sim_time: float) -> int:
        return min(
            int(sim_time // self.slot_length),
            self.num_slots - 1
        )

    def slot_label(self, idx: int) -> str:
        start = self.real_start + idx * self.slot_length
        end = start + self.slot_length
        return f"{start//60:02d}:{start%60:02d}-{end//60:02d}:{end%60:02d}"

    def range_to_sim(self, tr: str):
        s, e = tr.split("-")
        return (
            self.to_sim(parse_hour_min(s)),
            self.to_sim(parse_hour_min(e))
        )