function count_occurrences(array) {
    const counts = {};
    
    array.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
    });
    
    return counts;
}

Papa.parse("assets/csv/dummy.csv", {
    download: true,
    header: true,
    complete: function(results) {
        const devices = results.data.map(row => row.device_name);
        const tasks = results.data.map(row => row.task)
        console.log(devices);
        console.log(tasks);
    }
});

const dict = count_occurences(devices);
console.log(dict);
