import { observer } from "mobx-react";
import { useStores } from "models";
import { useEffect, useState } from "react";
import ActivityCalendar from "components/activity-calendar/ActivityCalendar";
import { blue } from "@ant-design/colors";

const lastYear = new Date();
const todayStr = lastYear.toISOString().split("T", 1)[0];
lastYear.setFullYear(lastYear.getFullYear() - 1);
const lastYearStr = lastYear.toISOString().split("T", 1)[0];

export const Activity = observer(() => {
  const { expRunStore } = useStores();
  const [activity, setActivity] = useState([] as any[]);

  useEffect(() => {
    expRunStore.fetchActivity(lastYear).then((activity) => {
      activity.sort((a, b) => a.date.localeCompare(b.date));

      let data = [];
      if (activity.length === 0 || activity[0].date !== lastYearStr) {
        data.push({ date: lastYearStr, level: 0 as 0, count: 0 });
      }
      if (
        activity.length === 0 ||
        activity[activity.length - 1].date !== todayStr
      ) {
        data.push({ date: todayStr, level: 0 as 0, count: 0 });
      }

      for (const item of activity) {
        data.push({ ...item, level: Math.min(4, Math.ceil(item.count / 5)) });
      }
      setActivity(data);
    });
  }, []);

  return (
    <div style={{ marginLeft: 37 }}>
      <ActivityCalendar
        color={blue[6]}
        data={activity}
        labels={{
          legend: {
            less: "Less",
            more: "More",
          },
          months: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ],
          tooltip: "<strong>{{count}} experiment runs</strong> on {{date}}",
          totalCount: "{{count}} experiment runs in {{year}}",
          weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        }}
        showWeekdayLabels={true}
      ></ActivityCalendar>
    </div>
  );
});
