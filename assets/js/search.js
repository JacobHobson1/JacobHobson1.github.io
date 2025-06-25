Papa.parse("assets/csv/dummy.csv", {
    download: true,
    header: true,
    complete: function(results) {
        console.log(results.data);
    }
});