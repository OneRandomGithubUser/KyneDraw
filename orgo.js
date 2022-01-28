const bondLength = 50;
var bondAngle = 0;
var atoms = []; // list of the atom ID and then its two coordinates
var nextID = 0; // next atom ID
var bondType = 1;
var bonds = []; // list of the bond type and then the two atoms, named by their ID, and then the bond angle
var network = []; // list of one atom ID, then alternating between a bond type and the second atom ID and then the bond angle
var closestDistance = 0; // 20 is the maximum distance for selection
var selectedAtom = []; // selected atom when snap-on is in effect
var destinationAtom = [];
var previewX1 = 0;
var previewY1 = 0;
var previewX2 = 0;
var previewY2 = 0; // to determine where the cursor is, with snap-on
const selectionDistance = 20;
const destinationDistance = 5;
var mousePressed = false;
var id1 = 0;
function setup() {
  // createCanvas must be the first statement
  createCanvas(window.innerWidth-16,window.innerHeight-20);
  stroke(0); // Set line drawing color to black
  frameRate(60);
}

function draw() {
  resizeCanvas(window.innerWidth-16,window.innerHeight-20);
  background(255); // Set the background to white
  // draw UI
  fill(230);
  if (mouseX > 20 && mouseY > 20 && mouseX < 120 && mouseY < 120) {
    stroke(255);
    rect(20,20,100,100);
    stroke(0);
  } else {
    rect(20,20,100,100);
  }
  line(70-Math.cos(toRadians(330))*25,70-Math.sin(toRadians(330))*25,70+Math.cos(toRadians(330))*25,70+Math.sin(toRadians(330))*25);

  if (mouseX > 140 && mouseY > 20 && mouseX < 240 && mouseY < 120) {
    stroke(255);
    rect(140,20,100,100);
    stroke(0);
  } else {
    rect(140,20,100,100);
  }
  line(190-Math.cos(toRadians(330))*25,70-Math.sin(toRadians(330))*25,190+Math.cos(toRadians(330))*25,70+Math.sin(toRadians(330))*25);
  line(190-Math.cos(toRadians(330))*25-Math.cos(330-90)*5,70-Math.sin(toRadians(330))*25+Math.sin(330-90)*5,190+Math.cos(toRadians(330))*25-Math.cos(330-90)*5,70+Math.sin(toRadians(330))*25+Math.sin(330-90)*5);

  if (mouseX > 260 && mouseY > 20 && mouseX < 360 && mouseY < 120) {
    stroke(255);
    rect(260,20,100,100);;
    stroke(0);
  } else {
    rect(260,20,100,100);;
  }
  line(310-Math.cos(toRadians(330))*25,70-Math.sin(toRadians(330))*25,310+Math.cos(toRadians(330))*25,70+Math.sin(toRadians(330))*25);
  line(310-Math.cos(toRadians(330))*25-Math.cos(330-90)*5,70-Math.sin(toRadians(330))*25+Math.sin(330-90)*5,310+Math.cos(toRadians(330))*25-Math.cos(330-90)*5,70+Math.sin(toRadians(330))*25+Math.sin(330-90)*5);
  line(310-Math.cos(toRadians(330))*25+Math.cos(330-90)*5,70-Math.sin(toRadians(330))*25-Math.sin(330-90)*5,310+Math.cos(toRadians(330))*25+Math.cos(330-90)*5,70+Math.sin(toRadians(330))*25-Math.sin(330-90)*5);

  // render current atoms and bonds
  for (var i = 0; i < bonds.length; i++) {
    let currentBond = bonds[i];
    let atom1 = atoms[currentBond[1]];
    let atom2 = atoms[currentBond[2]];
    line(atom1[1], atom1[2], atom2[1], atom2[2]);
    if (currentBond[0]===2||currentBond[0]===3) {
      {lineOffset(atom1[1], atom1[2], atom2[1], atom2[2], currentBond[3], 5);}
      if (currentBond[0]===3) {lineOffset(atom1[1], atom1[2], atom2[1], atom2[2], currentBond[3], -5);}
    }
  }

  // calculate closest atom
  if (!mousePressed) {
  selectedAtom = []; // selected atom when snap-on is in effect
  closestDistance = selectionDistance;
  for (let i = 0; i < atoms.length; i++) {
    let currentAtom = atoms[i];
    let distance = Math.sqrt((mouseX-currentAtom[1])**2 + (mouseY-currentAtom[2])**2);
    if (distance < selectionDistance && distance < closestDistance) {
      closestDistance = distance;
      selectedAtom = currentAtom;
    }
  }
  }

  // render preview line and calculate new bond angle
  if (selectedAtom.length !== 0 && !mousePressed) { // selectedAtom is previously defined in cyan selection dot area
    let currentBondSectors = []; // ranges from 0 to 11 for each 30 degree sector
    for (let i = 0; i < network.length; i++) {
      let currentBond = network[i];
      if (currentBond[0] === selectedAtom[0]) {
        currentBondSectors.push(Math.floor(currentBond[3]/30)); // TODO: change if network structure changes
      }
    }
    switch (currentBondSectors.length) {
      case 1:
        let answer = (currentBondSectors[0]*30+120)%360
        let alternate = (currentBondSectors[0]*30+240)%360
        if (Math.min(alternate%180,180-(alternate%180)) < Math.min(answer%180,180-(answer%180))) {answer = alternate;}
        bondAngle = answer;
        break;
      case 2:
        bondAngle = (Math.floor((currentBondSectors[0]+currentBondSectors[1])/2)*30+180)%360;
        break;
      case 3:
        if (!currentBondSectors.includes(8) && !currentBondSectors.includes(9)) {
          bondAngle = 240;
        } else if (!currentBondSectors.includes(2) && !currentBondSectors.includes(3)) {
          bondAngle = 60;
        } else {
          for (let i = 1; i < 11; i++) {
            if (!currentBondSectors.includes(i)) {
              bondAngle = i*30;
              break;
            }
          }
        }
        break;
      default:
        bondAngle=-1;
    }
    previewX1 = selectedAtom[1];
    previewY1 = selectedAtom[2];
    previewX2 = selectedAtom[1] + Math.cos(toRadians(360-bondAngle))*bondLength;
    previewY2 = selectedAtom[2] + Math.sin(toRadians(360-bondAngle))*bondLength;
  } else if (mousePressed) {
    previewX2 = mouseX;
    previewY2 = mouseY;
    bondAngle = Math.floor(toDegrees(Math.atan((mouseY-previewY1)/(mouseX-previewX1))));
  } else {
    previewX1 = mouseX;
    previewY1 = mouseY;
    previewX2 = mouseX + Math.cos(toRadians(360-bondAngle))*bondLength;
    previewY2 = mouseY + Math.sin(toRadians(360-bondAngle))*bondLength;
    bondAngle = 330;
  }
  
  // render cyan/red selection dot
  if (selectedAtom.length !== 0) {
    if (bondAngle === -1) {fill(255,0,0);} else {fill(48,227,255);}
    circle(selectedAtom[1],selectedAtom[2],10);
    fill(255);
  }

  // calculate destination atom
  destinationAtom = []; // destination atom
  closestDistance = destinationDistance;
  for (let i = 0; i < atoms.length; i++) {
    let currentAtom = atoms[i];
    let distance = Math.sqrt((previewX2-currentAtom[1])**2 + (previewY2-currentAtom[2])**2);
    if (distance < destinationDistance && distance < closestDistance) {
      closestDistance = distance;
      destinationAtom = currentAtom;
    }
  }
  // render cyan destination dot
  if (destinationAtom.length !== 0) {
    fill(48,227,255);
    circle(destinationAtom[1],destinationAtom[2],10);
    fill(255);
    previewX2 = destinationAtom[1];
    previewY2 = destinationAtom[2];
    bondAngle = Math.floor(toDegrees(Math.atan((destinationAtom[2]-selectedAtom[2])/(destinationAtom[1]-selectedAtom[1]))));
  }

  if (bondAngle !== -1) {
    line(previewX1, previewY1, previewX2, previewY2); // draw preview bond
    if (bondType === 2 || bondType === 3) {
      lineOffset(previewX1, previewY1, previewX2, previewY2, bondAngle, 5);
      if (bondType === 3) {lineOffset(previewX1, previewY1, previewX2, previewY2, bondAngle,-5);}
    }
  }
}

function mouseClicked() {
console.log(network);
console.log(bonds);


// TODO: make selectedBox variable to expedite this
  if (mouseX > 20 && mouseY > 20 && mouseX < 120 && mouseY < 120) {
    bondType = 1;
  } else if (mouseX > 140 && mouseY > 20 && mouseX < 240 && mouseY < 120) {
    bondType = 2;
  } else if (mouseX > 260 && mouseY > 20 && mouseX < 360 && mouseY < 120) {
    bondType = 3;
  } else {



  if (bondAngle === -1) {return false;} // -1 means invalid bond
  let id1 = nextID;
  if (selectedAtom.length !== 0) {
    id1 = selectedAtom[0];
  }
  network.push([id1, bondType, nextID+1, bondAngle]); // TEMPORARY, CANNOT SUPPORT DELETION
  if (selectedAtom.length === 0) {
    atoms.push([id1, previewX1, previewY1]);
    nextID++;
  }

  let id2 = nextID;
  if (destinationAtom.length !== 0) {
    id2 = destinationAtom[0];
  }
  network.push([id2, bondType, id1, (180+bondAngle)%360]); // TEMPORARY, CANNOT SUPPORT DELETION
  if (destinationAtom.length === 0) {
    atoms.push([id2, previewX2, previewY2]);
    nextID++;
  }
  bonds.push([bondType, id1, id2, bondAngle]);
return false;
}
}

function mouseDragged() {
  mousePressed = true;
}

function mouseReleased() {
  mousePressed = false;
}

function toRadians (angle) {
  return angle * (Math.PI/180); // 360-angle because it's stupid to go clockwise instead of counterclockwise when measuring an angle
}

function toDegrees (angle) {
  return angle * (180/Math.PI);
}

function lineOffset (x1,y1,x2,y2,angle,offset) {
  line(x1-Math.sin(toRadians(angle))*offset, y1-Math.cos(toRadians(angle))*offset, x2-Math.sin(toRadians(angle))*offset, y2-Math.cos(toRadians(angle))*offset);
}