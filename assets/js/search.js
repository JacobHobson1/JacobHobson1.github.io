function count_occurrences(array) {
    const counts = {};
    
    array.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
    });
    
    return counts;
}

function create_list(countsDict, containerSelector, name) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = ''; // Clear existing
    
    Object.entries(countsDict).forEach(([value, count]) => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = name;
        checkbox.value = value;
        
        const span = document.createElement('span');
        span.textContent = `${value} (${count})`;
        
        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
}

Papa.parse("assets/csv/dummy.csv", {
    download: true,
    header: true,
    complete: function(results) {
        const devices = results.data.map(row => row.device_name);
        const tasks = results.data.map(row => row.task)
        console.log(devices);
        console.log(tasks);

        const deviceCounts = count_occurrences(devices);
        const taskCounts = count_occurrences(tasks);
        
        console.log('Device counts:', deviceCounts);
        console.log('Task counts:', taskCounts);

        create_list(deviceCounts,"#device-checkboxes","devices")
        create_list(taskCounts,"#task-checkboxes","tasks")
    }
});

