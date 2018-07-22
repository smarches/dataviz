
function id(n){
	return document.getElementById(n);
}

const W = 1300,H = 2000;  // overall canvas size
const fills = ["#ffa319","#85adff","#ff4d94","#82c8ad"];  // bar colors
const lnam = ["Non-fiction","Fiction","Poetry","Other"];
const wakeBreaks = [5,6,7,8,9,10]; // when plotting by waking time, group by times, not just every 5
var grpBreaks = [];     // otherwise, break every 5 items
const wake_col = 7; 	// the 'default' sorting column location
var sortVar = "wake";   // used by plotSVG function to determine the locations of break points
var sort_ascending = true; // toggle when repaint is called and sortVar is the same
const Nobels = [];      // a 'const' array can be modified at will with methods; just cannot literally reassign the name.
const Pulitzers = [];
var D; // this gets filled in after we read the csv below

function sorter(ds,col,asc){ //sort data set 'ds' by the given column
	ds.sort(function(a,b){
		if(asc){
			return d3.ascending(a[col],b[col]);
		} else {
			return d3.descending(a[col],b[col]);
		}
	});
	return ds;
}

// main routine: 'd' is the data (which should be sorted according to 'curr'
// 'curr' is the index of the column the data is sorted by now,
// 'prev' is the column index of the previously sorted data
function plotSVG(d,curr,prev){
	let L = d.length;
	canv = d3.select("#canvas");
	// title
	canv.append("text").attr("x",400).attr("y",60).html("Authors' waking hour and productivity").style("font-size","22pt");
	// put in a legend for color codes and prize icons
	var legOffsetX = 15;  
	const legOffsetY = 110;
	var legW = legOffsetX + 8;
	canv.append("rect").attr("x",legOffsetX).attr("y",legOffsetY).attr("width",270).attr("height",40).attr("class","legend").attr("rx",16).attr("ry",10);
	// add prize icons
	canv.append("image").attr("x",legW).attr("y",legOffsetY+5).attr("height",28).attr("width",28).attr("xlink:href","img/RibbonPrize.svg");
	legW += 26;
	canv.append("text").attr("x",legW).attr("y",legOffsetY+25).html("Nobel Prize");
	legW += 100;
	canv.append("image").attr("x",legW).attr("y",legOffsetY+10).attr("height",20).attr("width",15).attr("xlink:href","img/prize-icon.svg");
	legW += 20;
	canv.append("text").attr("x",legW).attr("y",legOffsetY+25).html("Pulitzer Prize");
	legOffsetX += 440; legW += 300;
	// add labels and colors in legend; give each circle an ID so it can have its own onclick() method
	canv.append("rect").attr("x",legOffsetX).attr("y",legOffsetY).attr("width",580).attr("height",40).attr("class","legend").attr("rx",16).attr("ry",10);
	for(var i=0;i<fills.length;i++){
		btxt = "button"+i;
		legW += 15;
		canv.append("circle").attr("cx",legW).attr("cy",legOffsetY+20).attr("r",11).attr("id",btxt).style("fill",fills[i]);
		legW += 18;
		canv.append("text").attr("x",legW).attr("y",legOffsetY+25).html(lnam[i]);
		legW += 110;
	}
	// add the axis label
	canv.append("text").attr("x",legOffsetX+220).attr("y",legOffsetY+80).text("Total works written").attr("id","axisLab").style("font-size","14pt");
	const plotOffsetX = 250, plotOffsetY = legOffsetY + 120, breakSpace = 15;
	const plotHeight = 25*(L+1) + (sortVar==="wake" ? wakeBreaks.length*breakSpace : grpBreaks.length*breakSpace );
	
	// put a background for the plot and draw some reference lines (one dim only since y-axis isn't necessarily numeric)
	canv.append("rect").attr("x",plotOffsetX).attr("y",plotOffsetY-10).attr("height",plotHeight).attr("width",W-plotOffsetX).attr("class","bg").attr("rx",10).attr("ry",10);
	var lineX = plotOffsetX + 200; // draw a line at every 20 books and put axis labels
	while(lineX < W){
		numLab = Math.floor((lineX-plotOffsetX)/10);
		canv.append("text").attr("x",lineX).attr("y",plotOffsetY-12).attr("class","axisLabel").html(numLab);
		canv.append("text").attr("x",lineX).attr("y",plotOffsetY+plotHeight+8).attr("class","axisLabel").html(numLab);
		canv.append("line").attr("x1",lineX).attr("y1",plotOffsetY).attr("x2",lineX).attr("y2",plotHeight+plotOffsetY-10);
		lineX += 200;
	}
	// insert clock icon above the waking times and quill above author names
	canv.append("image").attr("x",10).attr("y",plotOffsetY-35).attr("height",23).attr("width",23).attr("id","author").attr("xlink:href","img/quill-2.svg");
	canv.append("image").attr("x",plotOffsetX-35).attr("y",plotOffsetY-32).attr("height",20).attr("width",20).attr("id","time").attr("xlink:href","img/clock-time-7.svg");
	currH = plotOffsetY;
	var ord = [0,1,2,3];  // order to plot the bars
	if(curr > 3){
		ord.splice(curr-3,1);
		ord.unshift(curr-3);
	} else if(curr < 3 && prev > 2){ // keep the previous sorting on 'type of work'
		ord.splice(prev-3,1);
		ord.unshift(prev-3);
	}
	let useBreaks = sortVar === "wake" ? wakeBreaks.slice(0) : grpBreaks.slice(0); // we want a deep copy, not a reference!
	if(!sort_ascending && sortVar === "wake") useBreaks.reverse();  // because then the reverse method will also affect the global
	var breakPos = 0;  // increments through break points
	for(var i=0;i<L;i++){
		currW = 10;
		wake = Number(d[i][2]);
		var wktxt;
		if(Math.round(wake) === wake){
			wktxt = wake + ":00";
		} else { 
			wktxt = Math.floor(wake) + ":30";
		}
		if(sortVar === "wake"){
			if(wake === useBreaks[breakPos]){  // add a break point at every hour in 5,...,10
				currH += 15;
				breakPos++;
			}
		} else if(useBreaks.includes(i)){
			currH += 15;
		}
		let timeoffset = plotOffsetX - ((wktxt.length===4) ? 40 : 49); // hacky way of right-aligning the text...cannot find documentation on this!!!
		canv.append("text").attr("x",currW).attr("y",currH-5).attr("dy",20).html(d[i][1]+" "+d[i][0]); // append the name
		canv.append("text").attr("x",timeoffset).attr("y",currH-5).attr("dy",20).html(wktxt);
		// check if we should add prize icons
		if(Nobels.includes(d[i][0])){
			canv.append("image").attr("x",plotOffsetX-72).attr("y",currH-1).attr("height",24).attr("width",20).attr("xlink:href","img/RibbonPrize.svg");
		}
		if(Pulitzers.includes(d[i][0])){
			canv.append("image").attr("x",plotOffsetX-85).attr("y",currH+3).attr("height",16).attr("width",12).attr("xlink:href","img/prize-icon.svg");
		}
		currW += plotOffsetX; // plot rectangles after the names
		for(var j=0;j<4;j++){
			let barW = 10*d[i][ord[j]+3];
			if(barW > 0){
				canv.append("rect").attr("x",currW).attr("y",currH).attr("width",barW).attr("fill", fills[ord[j]]).attr("height",20).attr("class","dataBar");
				currW += barW ;  // move over to start of next rectangle and add space for stroke
			}
		}
		currH += 25;
	}
	setButtons(curr); // make sure to enumerate the .onlick() methods *after* the canvas has been drawn
}

function annotateBar(elem){ // when hovering, add the number
	var canv = d3.select("#canvas");
	var num = Number(elem.getAttribute("width"))/10;
	var x1 = Number(elem.getAttribute("x"));
	if(num > 2){x1 += 10*(num-1)-5;}
	else if(num === 1){x1 += 15;}
	else{x1 += 23;}
	var y1 = Number(elem.getAttribute("y"))+6;
	canv.append("text").attr("id","infobin").attr("x",x1).attr("y",y1).attr("dx",10).attr("dy",10).html(num).style("text-anchor","end");
}

function repaint(i,iOld){
	// remove the old canvas and add a new one
	d3.select("#canvas").remove();
	d3.select("body").append("svg").attr("width",W).attr("height",H).attr("id","canvas").attr("class","chart");
	sortVar = (i===2) ? "wake" : "other";
	if(i === iOld){
		sort_ascending = !sort_ascending;
	} else {
		sort_ascending = i < 3 ? true : false; // ascending is default for time and name, while descending is default for # works
	}
	plotSVG(sorter(D,i,sort_ascending),i,iOld);
	// set up the freshly made book counts to display their length when hovered
	var bars = document.getElementsByClassName("dataBar");
	for(var j=0;j<bars.length;j++){
		bars[j].onmouseover = function(){annotateBar(this);};
		bars[j].onmouseout = function(){d3.select("#infobin").remove();};
	}
}

// when the canvas is re-drawn, add event listeners to the sort buttons
function setButtons(iOld){
	id("button0").onclick = function(){ repaint(3,iOld); };
	id("button1").onclick = function(){ repaint(4,iOld); };
	id("button2").onclick = function(){ repaint(5,iOld); };
	id("button3").onclick = function(){ repaint(6,iOld); };
	id("author").onclick = function(){ repaint(0,iOld); };
	id("time").onclick = function(){ repaint(2,iOld); };	
}
 
var isFirefox = typeof InstallTrigger !== 'undefined';
var isChrome = !!window.chrome && !!window.chrome.webstore;

// after getting the data from either .csv or hard-coded JSON, feed it here, populate global variables, and enter main 'loop' @ end.
function prepData(ds){
	D = ds.map(function(d){
		return [d.Surname,d.Name,+d.Wake,+d.Non_fiction,+d.fiction,+d.poetry,+d.other,+d.total,+d.born,+d.died,+d.Nobel,+d.Pulitzer];
	});
	D.total = ds.map(function(dat){ return +dat.Non_fiction + +dat.fiction + +dat.poetry + +dat.other; });
	D.lifespan = ds.map(function(d){ return d.died - d.born; });
	for(var i=0;i<D.length;i++){
		if(D[i][10]===1) Nobels.push(D[i][0]);
		if(D[i][11]===1) Pulitzers.push(D[i][0]);
	}
	let num_per_group = 5;
	// populate grpBreaks array according to size of data: break locations are every 5 names. We do need a two-argument signature in the arrow function
	grpBreaks = Array.from(new Array(Math.floor(D.length/num_per_group)), (v,ix) => {return num_per_group*(ix+1);});
	repaint(2,3);
}

if(!isChrome){ // in case we're sourcing the file from disk, Chrome does not allow this
	d3.csv("authorData.csv").then(
	prepData, // the function we call should take one argument, which is the data set formatted as below
	function(){
		id('log').innerHTML = "An error occured loading the data!";
	});
} else { // the following (grossly redundant) representation is equivalent to the way D3 parses the .csv: each row of data is an object literal with all the name-value pairs
	Dt = [
		{"Surname":"Balzac","Name":"Honore de","Wake":1,"Non_fiction":0,"fiction":19,"poetry":1,"other":6,"total":26,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1799,"died":1850,"suicide":""},
		{"Surname":"Murakami","Name":"Haruki","Wake":4,"Non_fiction":23,"fiction":16,"poetry":0,"other":0,"total":39,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1949,"died":2015,"suicide":""},
		{"Surname":"Plath","Name":"Sylvia","Wake":4,"Non_fiction":5,"fiction":5,"poetry":9,"other":1,"total":20,"Nobel":"","Pulitzer":"1","Other_Prize":"1","born":1932,"died":1963,"suicide":"1"},
		{"Surname":"Franklin","Name":"Benjamin","Wake":5,"Non_fiction":8,"fiction":1,"poetry":0,"other":0,"total":9,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1706,"died":1790,"suicide":""},
		{"Surname":"Sacks","Name":"Oliver","Wake":5,"Non_fiction":12,"fiction":0,"poetry":0,"other":0,"total":12,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1933,"died":2015,"suicide":""},
		{"Surname":"Morrison","Name":"Toni","Wake":5,"Non_fiction":7,"fiction":15,"poetry":0,"other":1,"total":23,"Nobel":"1","Pulitzer":"1","Other_Prize":"1","born":1931,"died":2015,"suicide":""},
		{"Surname":"Mead","Name":"Margaret","Wake":5,"Non_fiction":12,"fiction":0,"poetry":0,"other":4,"total":16,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1901,"died":1978,"suicide":""},
		{"Surname":"Kant","Name":"Immanuel","Wake":5,"Non_fiction":53,"fiction":0,"poetry":0,"other":0,"total":53,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1724,"died":1804,"suicide":""},
		{"Surname":"Sitwell","Name":"Edith","Wake":5.5,"Non_fiction":12,"fiction":1,"poetry":20,"other":0,"total":33,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1887,"died":1964,"suicide":""},
		{"Surname":"Hemingway","Name":"Ernest","Wake":6,"Non_fiction":11,"fiction":19,"poetry":2,"other":10,"total":42,"Nobel":"1","Pulitzer":"1","Other_Prize":"","born":1899,"died":1961,"suicide":"1"},
		{"Surname":"Asimov","Name":"Issac","Wake":6,"Non_fiction":0,"fiction":68,"poetry":0,"other":0,"total":68,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1920,"died":1992,"suicide":""},
		{"Surname":"Tharp","Name":"Twyla","Wake":5.5,"Non_fiction":3,"fiction":0,"poetry":0,"other":0,"total":3,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1941,"died":2015,"suicide":""},
		{"Surname":"Wharton","Name":"Edith","Wake":6,"Non_fiction":9,"fiction":40,"poetry":3,"other":0,"total":52,"Nobel":"","Pulitzer":"1","Other_Prize":"","born":1862,"died":1937,"suicide":""},
		{"Surname":"Vonnegut","Name":"Kurt","Wake":6,"Non_fiction":10,"fiction":30,"poetry":2,"other":15,"total":57,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1922,"died":2007,"suicide":""},
		{"Surname":"O'Connor","Name":"Flannery","Wake":6,"Non_fiction":6,"fiction":5,"poetry":0,"other":2,"total":13,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1925,"died":1964,"suicide":""},
		{"Surname":"Nabokov","Name":"Vladimir","Wake":6,"Non_fiction":19,"fiction":34,"poetry":10,"other":0,"total":63,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1899,"died":1977,"suicide":""},
		{"Surname":"Kalman","Name":"Maira","Wake":6,"Non_fiction":20,"fiction":15,"poetry":0,"other":0,"total":35,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1949,"died":2015,"suicide":""},
		{"Surname":"Ebert","Name":"Roger","Wake":7,"Non_fiction":12,"fiction":1,"poetry":0,"other":1,"total":14,"Nobel":"","Pulitzer":"1","Other_Prize":"","born":1942,"died":2013,"suicide":""},
		{"Surname":"Dickens","Name":"Charles","Wake":7,"Non_fiction":9,"fiction":30,"poetry":2,"other":1,"total":42,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1812,"died":1870,"suicide":""},
		{"Surname":"Goethe","Name":"Johann W.","Wake":7,"Non_fiction":7,"fiction":23,"poetry":14,"other":1,"total":45,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1749,"died":1832,"suicide":""},
		{"Surname":"King","Name":"Stephen","Wake":8,"Non_fiction":1,"fiction":76,"poetry":0,"other":13,"total":90,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1947,"died":2015,"suicide":""},
		{"Surname":"Talese","Name":"Gay","Wake":8,"Non_fiction":9,"fiction":1,"poetry":0,"other":0,"total":10,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1932,"died":2015,"suicide":""},
		{"Surname":"Darwin","Name":"Charles","Wake":8,"Non_fiction":36,"fiction":0,"poetry":0,"other":0,"total":36,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1809,"died":1882,"suicide":""},
		{"Surname":"Sontag","Name":"Susan","Wake":8,"Non_fiction":10,"fiction":14,"poetry":0,"other":0,"total":24,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1933,"died":2004,"suicide":""},
		{"Surname":"Jung","Name":"Carl","Wake":8,"Non_fiction":53,"fiction":0,"poetry":0,"other":0,"total":53,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1875,"died":1961,"suicide":""},
		{"Surname":"Kafka","Name":"Franz","Wake":8.5,"Non_fiction":23,"fiction":8,"poetry":0,"other":0,"total":31,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1883,"died":1924,"suicide":""},
		{"Surname":"Bradbury","Name":"Ray","Wake":9,"Non_fiction":12,"fiction":66,"poetry":0,"other":49,"total":127,"Nobel":"","Pulitzer":"1","Other_Prize":"1","born":1920,"died":2012,"suicide":""},
		{"Surname":"Tolstoy","Name":"Leo","Wake":9,"Non_fiction":47,"fiction":18,"poetry":0,"other":0,"total":65,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1828,"died":1910,"suicide":""},
		{"Surname":"Lewis","Name":"C. S.","Wake":9,"Non_fiction":46,"fiction":18,"poetry":4,"other":0,"total":68,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1898,"died":1963,"suicide":""},
		{"Surname":"Vidal","Name":"Gore","Wake":9,"Non_fiction":25,"fiction":53,"poetry":0,"other":1,"total":79,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1925,"died":2012,"suicide":""},
		{"Surname":"Woolf","Name":"Virginia","Wake":9,"Non_fiction":30,"fiction":16,"poetry":0,"other":0,"total":46,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1882,"died":1941,"suicide":"1"},
		{"Surname":"Burroughs","Name":"William S.","Wake":9.5,"Non_fiction":11,"fiction":17,"poetry":0,"other":22,"total":50,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1914,"died":1997,"suicide":""},
		{"Surname":"Beauvoir","Name":"Simone de","Wake":10,"Non_fiction":3,"fiction":4,"poetry":0,"other":0,"total":7,"Nobel":"","Pulitzer":"","Other_Prize":"1","born":1908,"died":1986,"suicide":""},
		{"Surname":"Stein","Name":"Gertrude","Wake":10,"Non_fiction":20,"fiction":10,"poetry":2,"other":3,"total":35,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1874,"died":1946,"suicide":""},
		{"Surname":"Joyce","Name":"James","Wake":10,"Non_fiction":11,"fiction":8,"poetry":3,"other":0,"total":22,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1882,"died":1941,"suicide":""},
		{"Surname":"Fitzgerald","Name":"F. Scott","Wake":11,"Non_fiction":5,"fiction":20,"poetry":1,"other":2,"total":28,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1896,"died":1940,"suicide":""},
		{"Surname":"Bukowski","Name":"Charles","Wake":12,"Non_fiction":9,"fiction":14,"poetry":37,"other":3,"total":63,"Nobel":"","Pulitzer":"","Other_Prize":"","born":1920,"died":1994,"suicide":""}
	];
	prepData(Dt);
}