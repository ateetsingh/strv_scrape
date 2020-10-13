




// tweak following parameters in case of lag
var scrollInterval = 5000; // interval in milliseconds between consecutive scroll attempts
var unsuccessfulScrollCount = 20; // tolerance count for unsuccessful scroll attempts

var csvFields = ['athlete','datetime','activityTitle','activityType','Distance', 'Elev Gain', 'Time', 'Pace', 'Avg HR','Achievements' ];
var scrollHeight = -1;

function getActivityTypeFromIconClasses(classList){
	var iconClassToActivityMap = {
		'icon-ride' : 'Ride',
		'icon-workout' : 'Workout',
		'icon-run' : 'Run',
		'icon-walk' : 'Walk',
		'icon-yoga' : 'Yoga',
		'icon-weighttraining' : 'Weight Training',
	}
	for (var className of classList){
			var activityType = iconClassToActivityMap[className];
			if(activityType){
				return activityType;
			}
	}
	return 'Unknown'
}

function scrape(){
	console.info("Starting scrape..");
	var activities = [];
	var activityContainers = document.querySelectorAll("div.activity");
	if (activityContainers){
		for(var activity of activityContainers){
			var activityData = {}
			var athleteEntry = activity.querySelector("a.entry-athlete");
			if ( athleteEntry ) {
				activityData['athlete'] = athleteEntry.innerText;
				activityData['datetime'] = activity.querySelector("time").getAttribute("datetime");
				activityData['activityTitle'] = activity.querySelector(".activity-title").innerText;
				var activityIcon = activity.querySelector(".activity-title span.app-icon");
				activityData['activityType'] = getActivityTypeFromIconClasses( Array.from(activityIcon.classList) );
				var statList =  activity.querySelector("ul.inline-stats");
				for (var stat of [ 'Distance', 'Elev Gain', 'Time', 'Pace', 'Avg HR','Achievements' ] ){
					var statElement = statList.querySelector(`li[title='${stat}']`);
					if (statElement && statElement.innerText) {
						activityData[stat] = statElement.innerText;
					}
				}
				activities.push(activityData);
			}else {
				console.warning("No more athlete entries found - i.e. elements matching selector - div.activity");
			}
		}
	}else{
			console.warning("No activityContainers found - i.e. elements matching selector - a.entry-athlete");
	}
	var csvFileContent = objArrayToCsvFileContent(activities);
	var now = Date.now();
	createCsvDownloadFile(`activities_${now}.csv`, csvFileContent);
}

function objArrayToCsvFileContent(array) {
	var str = '';
	// add http headers 
	str += "data:text/csv;charset=utf-8,";
	// add csv headers 
	str += csvFields.join(',') + '\r\n';
	for (var i = 0; i < array.length; i++) {
		var line = '';
		var obj = array[i];
		for (const field of csvFields) {
			var value = obj[field] ? obj[field] : '';
			for (const escapeChar of ["#",";","?","@","&","=","+","$"]) {
				value = value.replace(escapeChar," "); // strip out especial chars  
			}
			value = value.replaceAll('"','""');  // escape double-quotes, i.e. replace each double-quote with pair of double-quotes
			line += `"${value}",`;  // enclose each field value within double quotes
		}
		str += line + '\r\n';
	}
	return str;
}

function createCsvDownloadFile(filename, csvContent){
	var encodedUri = encodeURI(csvContent);
	var link = document.createElement("a");
	link.setAttribute("href", encodedUri);
	link.setAttribute("download", filename);
	document.body.appendChild(link); 
	link.click(); 
}

function keyPressHandler(evt) {
  if(evt.ctrlKey && event.code ==  'KeyQ'){
    console.log('stopping auto-scroll..');
    unsuccessfulScrollCount = 0;
  }
}
document.addEventListener("keypress", keyPressHandler);


var interval = setInterval( scrollToBottom, scrollInterval);
function scrollToBottom() {
	console.info("scrollHeight=",document.body.scrollHeight);
	if(unsuccessfulScrollCount > 0){
		if(document.body.scrollHeight > scrollHeight){
			scrollHeight = document.body.scrollHeight;
			window.scrollTo(0,scrollHeight);
		}else{
			unsuccessfulScrollCount--;
		}
	}else{
		clearInterval(interval);
		scrape();
	}
}