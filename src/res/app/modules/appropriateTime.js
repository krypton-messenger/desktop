import "../resources/script/dayjs.min.js";
export {
    appropriateTime
};
const appropriateTime = (timestamp) => {
    let targetDate = dayjs(timestamp * 1000); // because shitty javascript won't take UNIX-Timestamp in s but in ms
    let currentDate = dayjs();

    // same day
    if (targetDate.startOf("day").valueOf() == currentDate.startOf("day").valueOf()) return new Date(targetDate).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    // yesterday
    if (targetDate.startOf("day").valueOf() == currentDate.subtract(1, "day").startOf("day").valueOf()) return "yesterday";

    // same week
    if (targetDate.startOf("week").valueOf() == currentDate.startOf("week").valueOf()) return new Date(targetDate).toLocaleDateString([], {
        weekday: "short"
    });

    // return "normal" date
    return new Date(targetDate).toLocaleDateString([], {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit"
    });
}