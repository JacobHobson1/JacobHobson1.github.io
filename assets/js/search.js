function count_occurrences(array) {
    const counts = {};
    
    array.forEach(item => {
        if (item && item.trim()) { // Filter out empty values
            counts[item] = (counts[item] || 0) + 1;
        }
    });
    
    return counts;
}

function create_list(countsDict, containerSelector, name) {
    const container = document.querySelector(containerSelector);
    
    if (!container) {
        console.error(`Container ${containerSelector} not found`);
        return;
    }
    
    container.innerHTML = ''
    
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

document.addEventListener('DOMContentLoaded', function() {
    Papa.parse("assets/csv/dummy.csv", {
        download: true,
        header: true,
        complete: function(results) {
            console.log('CSV loaded:', results); // Debug log
            
            const devices = results.data.map(row => row.device_name);
            const tasks = results.data.map(row => row.task);
            
            const deviceCounts = count_occurrences(devices);
            const taskCounts = count_occurrences(tasks);
            
            console.log('Device counts:', deviceCounts);
            console.log('Task counts:', taskCounts);

            create_list(deviceCounts, "#device-checkboxes", "devices");
            create_list(taskCounts, "#task-checkboxes", "tasks");
        },
        error: function(error) {
            console.error('Papa Parse error:', error);
        }
    });
});