// Written by Joseph. github.com/OneRandomGithubUser
const bondLength = 50;
var bondAngle = 0;
var nextID = 0; // next atom ID
var bondType = 1;
var element = "C";
var reagents = "";
var bondMode = true;
var network = []; // atom id (int), atom element (string), atomX (number), atomY (number), bond1 type (number), bond1 destination atom id, etc.
var closestDistance = 0; // 20 is the maximum distance for selection
var selectedAtom = []; // selected atom when snap-on is in effect
var destinationAtom = [];
var previewX1 = 0;
var previewY1 = 0;
var previewX2 = 0;
var previewY2 = 0; // to determine where the cursor is, with snap-on
const selectionDistance = 15;
const destinationDistance = 5;
var mousePressed = false;
var selectedBox = 0;
const minWidth = 1920;
const minHeight = 210;
let windowHeight = 0;
let windowLength = 0;
var previousMouseX = 0.0;
var previousMouseY = 0.0;
var angleSnap = true;
var validBond = true;
// TODO: bad practice to make so many global variables

function setup() {
  // createCanvas must be the first statement
  windowWidth = Math.max(window.innerWidth,minWidth);
  windowHeight = Math.max(window.innerHeight,minHeight);
  createCanvas(windowWidth,windowHeight);
  stroke(0); // Set line drawing color to black
  frameRate(60);
  console.log("Written by Joseph. github.com/OneRandomGithubUser");
}

let font;
function preload() {
  font = loadFont('./arial.ttf');
}

function draw() {
  windowWidth = Math.max(window.innerWidth-20,minWidth);
  windowHeight = Math.max(window.innerHeight-20,minHeight);
  resizeCanvas(windowWidth,windowHeight);
  background(255); // Set the background to white
  let cachedMouseX = mouseX;
  let cachedMouseY = mouseY;

  // draw UI
  fill(230);
  selectedBox = 0;
  if (cachedMouseY < 120 && cachedMouseY > 20) {
    if (cachedMouseX < 120 && cachedMouseX > 20) {
      selectedBox = 1; // single bond
    } else if (cachedMouseX < 240 && cachedMouseX > 140) {
      selectedBox = 2; // double bond
    } else if (cachedMouseX < 360 && cachedMouseX > 260) {
      selectedBox = 3; // triple bond
    } else if (cachedMouseX < 480 && cachedMouseX > 380) {
      selectedBox = 6; // C
    } else if (cachedMouseX < 600 && cachedMouseX > 500) {
      selectedBox = 7; // O
    } else if (cachedMouseX < 720 && cachedMouseX > 620) {
      selectedBox = 8; // N
    } else if (cachedMouseX < 840 && cachedMouseX > 740) {
      selectedBox = 9; // Br
    } else if (cachedMouseX < 960 && cachedMouseX > 860) {
      selectedBox = 10; // Cl
    } else if (cachedMouseY < 70) {
      if (cachedMouseX > windowWidth-120 && cachedMouseX < windowWidth-20) {
        selectedBox = 4; // FREEFORM BONDS
      } else if (cachedMouseX > windowWidth-240 && cachedMouseX < windowWidth-140) {
        selectedBox = 5; // SNAP BONDS
      }
    }
  }
  if (cachedMouseY > windowHeight-70 && cachedMouseY < windowHeight-20) {
    if (cachedMouseX < 360 && cachedMouseX > 260) {
      selectedBox = 11;
    } else if (cachedMouseX < 480 && cachedMouseX > 380) {
      selectedBox = 12;
    } else if (cachedMouseX < 600 && cachedMouseX > 500) {
      selectedBox = 13;
    } else if (cachedMouseX < 720 && cachedMouseX > 620) {
      selectedBox = 14;
    } else if (cachedMouseX < 840 && cachedMouseX > 740) {
      selectedBox = 15;
    } else if (cachedMouseX < 960 && cachedMouseX > 860) {
      selectedBox = 16;
    } else if (cachedMouseX < 1080 && cachedMouseX > 980) {
      selectedBox = 17;
    } else if (cachedMouseX < 1200 && cachedMouseX > 1100) {
      selectedBox = 18;
    } else if (cachedMouseX < 1320 && cachedMouseX > 1220) {
      selectedBox = 19;
    } else if (cachedMouseX < 1440 && cachedMouseX > 1340) {
      selectedBox = 20;
    } else if (cachedMouseX < 1560 && cachedMouseX > 1460) {
      selectedBox = 21;
    } else if (cachedMouseX < 1680 && cachedMouseX > 1580) {
      selectedBox = 22;
    } else if (cachedMouseX < 1800 && cachedMouseX > 1700) {
      selectedBox = 23;
    } else if (cachedMouseX < 1920 && cachedMouseX > 1820) {
      selectedBox = 24;
    }
  }
  bondButton(20,20,1);
  bondButton(140,20,2);
  bondButton(260,20,3);

  if (angleSnap) {
    fill(205);
  }
  if (selectedBox === 4) {
    stroke(255);
    rect(windowWidth-120,20,100,50);
    stroke(0);
  } else {
    rect(windowWidth-120,20,100,50);
  }
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(16);
  noStroke();
  textStyle(BOLD);
  text("SNAP BONDS",windowWidth-120,20,100,50);
  textStyle(NORMAL);
  stroke(0);
  fill(230);

  if (!angleSnap) {
    fill(205);
  }
  if (selectedBox === 5) {
    stroke(255);
    rect(windowWidth-240,20,100,50);
    stroke(0);
  } else {
    rect(windowWidth-240,20,100,50);
  }
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(16);
  noStroke();
  textStyle(BOLD);
  text("FREEFORM BONDS",windowWidth-240,20,100,50);
  textStyle(NORMAL);
  stroke(0);
  fill(230);

  atomButton(380,20,"C",6);
  atomButton(500,20,"O",7);
  atomButton(620,20,"N",8);
  atomButton(740,20,"Br",9);
  atomButton(860,20,"Cl",10);
  
  reactionButton(260,windowHeight-70,"POCl₃",11);
  reactionButton(380,windowHeight-70,"KOH",12);
  reactionButton(500,windowHeight-70,"HBr",13);
  reactionButton(620,windowHeight-70,"HBr, H₂O₂",14);
  reactionButton(740,windowHeight-70,"Br₂",15);
  reactionButton(860,windowHeight-70,"Br₂, H₂O",16);
  reactionButton(980,windowHeight-70,"H₂, Pd",17);
  reactionButton(1100,windowHeight-70,"Hg(OAc)₂,H₂O,BH₄",18);
  reactionButton(1220,windowHeight-70,"BH₃",19);
  reactionButton(1340,windowHeight-70,"NaBH₄",20);
  reactionButton(1460,windowHeight-70,"Swern",21);
  reactionButton(1580,windowHeight-70,"PBr₃",22);
  reactionButton(1700,windowHeight-70,"SOCl₂",23);
  reactionButton(1820,windowHeight-70,"TsCl",24);

  if (!mousePressed) {selectedAtom = [];} // selected atom when snap-on is in effect
  closestDistance = selectionDistance;
  let distance = 0;
  validBond = true;

  // cycle through all atoms
  for (let i = 0; i < network.length; i++) {
    let currentAtom = network[i];

    // render preexisting bonds
    if (countBonds(currentAtom) !== 0) {
      for (let j = 4; j < currentAtom.length; j+=2) {
        if (currentAtom[j+1] > currentAtom[0]) {
          bond(currentAtom[2], currentAtom[3], network[currentAtom[j+1]][2], network[currentAtom[j+1]][3], currentAtom[j]);
        }
      }
    }
    
    // render preexisting atoms
    noStroke();
    if (currentAtom[1] === -1) {
      continue; // deleted atom
    } else {
      let label = currentAtom[1];
      if (currentAtom[1] === "C") {
        if (countBonds(currentAtom) === 0) {
          label = "CH₄"
        } else {
          label = "";
        }
      } else if (label === "O") {
        switch (countBonds(currentAtom)) {
          case 0:
            label = "H₂O";
            break;
          case 1:
            label = "OH";
            break;
        }
      } else if (label === "N") {
        switch (countBonds(currentAtom)) {
          case 0:
            label = "NH₃";
            break;
          case 1:
            label = "NH₂";
            break;
          case 2:
            label = "NH";
            break;
        }
      }
      if (label !== "") {
        textAlign(CENTER, CENTER);
        fill(255);
        rectMode(CENTER);
        let boundingBox = font.textBounds(label, currentAtom[2], currentAtom[3], 20, CENTER);
        rectMode(CORNER);
        rect(boundingBox.x-5, boundingBox.y-5, boundingBox.w+10, boundingBox.h+10);
        fill(0);
        textSize(20);
        rectMode(CENTER);
        text(label, currentAtom[2], currentAtom[3]);
        rectMode(CORNER);
        fill(255);
      }
    }
    stroke(0);

    // calculate closest selected atom as long as the mouse is not pressed
    if (!mousePressed) {
      let distance = Math.sqrt((cachedMouseX-currentAtom[2])**2 + (cachedMouseY-currentAtom[3])**2);
      if (distance < closestDistance) {
        closestDistance = distance;
        selectedAtom = currentAtom;
      }
    }
  }

  // calculate new bond angle
  if (selectedAtom.length !== 0 && !mousePressed && bondMode) { // selectedAtom is previously defined in cyan selection dot area
    let currentBondSectors = []; // ranges from 0 to 11 for each 30 degree sector, starting at -15 degrees
    let currentBondAngles = [];
    if (countBonds(selectedAtom) !== 0) {
      for (let i = 5; i < selectedAtom.length; i+=2) {
        currentBondAngles.push(Math.round(findBondAngle(selectedAtom[2], selectedAtom[3], network[selectedAtom[i]][2], network[selectedAtom[i]][3])));
        currentBondSectors.push(Math.floor((findBondAngle(selectedAtom[2], selectedAtom[3], network[selectedAtom[i]][2], network[selectedAtom[i]][3])+15)/30));
      }
    }
    bondAngle = calculateBondAngle(currentBondSectors,currentBondAngles); // TODO: change calculateBondAngle such that alkynes are linear
    previewX1 = selectedAtom[2];
    previewY1 = selectedAtom[3];
    previewX2 = selectedAtom[2] + Math.cos(toRadians(360-bondAngle))*bondLength;
    previewY2 = selectedAtom[3] + Math.sin(toRadians(360-bondAngle))*bondLength;
    if (countBonds(selectedAtom) > 4-bondType) { // too many bonds
      bondAngle = -1;
    }
  } else if (mousePressed) { // on mouse press, stop updating previewX1 and previewY1
    if (angleSnap) {
      bondAngle = Math.floor((findBondAngle(previewX1,previewY1,cachedMouseX,mouseY)+15)/30)*30 // round bond angle to nearest 30 degrees
      previewX2 = previewX1 + Math.cos(toRadians(360-bondAngle))*bondLength;
      previewY2 = previewY1 + Math.sin(toRadians(360-bondAngle))*bondLength;
    } else {
      previewX2 = cachedMouseX;
      previewY2 = mouseY;
      bondAngle = findBondAngle(previewX1,previewY1,cachedMouseX,mouseY);
    }
  } else { // fallback
    previewX1 = cachedMouseX;
    previewY1 = mouseY;
    previewX2 = cachedMouseX + Math.cos(toRadians(360-bondAngle))*bondLength;
    previewY2 = mouseY + Math.sin(toRadians(360-bondAngle))*bondLength;
    bondAngle = 330;
  }
  
  // render cyan/red selection dot
  if (selectedAtom.length !== 0) {
    if (bondAngle === -1) {
      fill(255,0,0);
      validBond = false;
    } else {
      fill(48,227,255);
      validBond = true;
    }
    circle(selectedAtom[2],selectedAtom[3],10);
    fill(255);
  }

  if (bondMode) {
    // calculate destination atom
    destinationAtom = []; // destination atom
    closestDistance = destinationDistance;
    for (let i = 0; i < network.length; i++) {
      let currentAtom = network[i];
      let distance = Math.sqrt((previewX2-currentAtom[2])**2 + (previewY2-currentAtom[3])**2);
      if (distance < destinationDistance && distance < closestDistance && validBond) {
        if (countBonds(selectedAtom) !== 0) {
          for (let i = 5; i < selectedAtom.length; i += 2) {
            if (selectedAtom[i] === destinationAtom[0]) {
              bondAngle = -1;
              validBond = false; // TODO: why does this not prevent you from doing two of the same bond???
              break;
            }
          }
        }
        if (validBond) {
          closestDistance = distance;
          destinationAtom = currentAtom;
        }
      }
    }

    // render cyan/red destination dot
    if (destinationAtom.length !== 0) {
      if (countBonds(destinationAtom) <= 4-bondType) {
        fill(48,227,255);
        circle(destinationAtom[2],destinationAtom[3],10);
        fill(255);
        previewX2 = destinationAtom[2];
        previewY2 = destinationAtom[3];
        bondAngle = findBondAngle(previewX1,previewY1,previewX2,previewY2);
      } else {
        fill(255,0,0);
        circle(destinationAtom[2],destinationAtom[3],10);
        fill(255);
        previewX2 = destinationAtom[2];
        previewY2 = destinationAtom[3];
        bondAngle = -1;
      }
    }
  }

  // draw preview
  if (!bondMode) {
    rectMode(CENTER);
    fill(0);
    noStroke();
    textSize(20);
    text(element, previewX1, previewY1);
    fill(255);
    stroke(0);
    rectMode(CORNER);
  } else if (validBond) {
    bond(previewX1, previewY1, previewX2, previewY2, bondType);
  }

  // introduction screen and pause rendering during inactivity
  if (frameCount < 120) {
    stroke(255);
    if (frameCount > 60) {
      fill(255,255-(frameCount-60)/60*255);
      rect(0,0,windowWidth,windowHeight);
      fill(0,255-(frameCount-60)/60*255);
    } else {      
      fill(255);
      rect(0,0,windowWidth,windowHeight);
      fill(0);
    }
    textSize(144);
    textAlign(CENTER, CENTER);
    text("KyneDraw",0,windowHeight/2,windowWidth);
    stroke(0);
  } else {
    if (previousMouseX === cachedMouseX && previousMouseY === mouseY) {
      noLoop();
    } else {
      previousMouseX = cachedMouseX;
      previousMouseY = cachedMouseY;
    }
  }
}

function mouseDragged() {
  loop();
  mousePressed = true;
}

function mouseMoved() {
  loop();
  return false;
}

function mouseReleased() {
  loop();
  mousePressed = false;
}

function toRadians (angle) {
  return angle * (Math.PI/180);
}

function toDegrees (angle) {
  return angle * (180/Math.PI);
}

function lineOffset (x1,y1,x2,y2,offset) {
  let angle = findBondAngle(x1,y1,x2,y2);
  line(x1-Math.sin(toRadians(angle))*offset, y1-Math.cos(toRadians(angle))*offset, x2-Math.sin(toRadians(angle))*offset, y2-Math.cos(toRadians(angle))*offset);
}

function bondButton (x,y,bonds) {
  if (bondType === bonds && bondMode) {fill(205);}
  if (selectedBox === bonds) {
    stroke(255);
    rect(x,y,100,100);
    stroke(0);
  } else {
    rect(x,y,100,100);
  }
  fill(230);
  line(x+50-Math.cos(toRadians(30))*bondLength/2,y+50-Math.sin(toRadians(30))*bondLength/2,x+50+Math.cos(toRadians(30))*bondLength/2,y+50+Math.sin(toRadians(30))*bondLength/2);
  if (bonds > 1) {
    lineOffset(x+50-Math.cos(toRadians(30))*bondLength/2,y+50-Math.sin(toRadians(30))*bondLength/2,x+50+Math.cos(toRadians(30))*bondLength/2,y+50+Math.sin(toRadians(30))*bondLength/2,5);
    if (bonds > 2) {
      lineOffset(x+50-Math.cos(toRadians(30))*bondLength/2,y+50-Math.sin(toRadians(30))*bondLength/2,x+50+Math.cos(toRadians(30))*bondLength/2,y+50+Math.sin(toRadians(30))*bondLength/2,-5);
    }
  }
}

function atomButton (x,y,atom,box) {
  if (element === atom && !bondMode) {fill(205);}
  if (selectedBox === box) {    
    stroke(255);
    rect(x,y,100,100);
    stroke(0);
  } else {
    rect(x,y,100,100);
  }
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(48);
  noStroke();
  text(atom,x,y,100,100);
  stroke(0);
  fill(230);
}


function reactionButton (x,y,reaction,box) {
  if (selectedBox === box) {
    stroke(255);
    rect(x,y,100,50);
    stroke(0);
  } else {
    rect(x,y,100,50);
  }
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(16);
  noStroke();
  textStyle(BOLD);
  text(reaction,x,y,100,50);
  textStyle(NORMAL);
  stroke(0);
  fill(230);
}


function findBondAngle (x1,y1,x2,y2) {
  let ans;
  if (y1 === y2) {
    switch (Math.sign(x1-x2)) {
      case 1:
        return 180;
      case -1:
        return 0;
      case 0:
        return -1;
    }
  } else {
    ans = toDegrees(Math.atan(-(y2-y1)/(x2-x1)));
  }
  if (ans < 0) {ans+=180;}
  if (-(y2-y1) < 0) {ans = (180+ans)%360;}
  return ans;
}

function calculateBondAngle (bseclist,banglelist) {
    switch (bseclist.length) {
      case 0:
        return 330;
      case 1:
        let answer = (bseclist[0]*30+120)%360
        let alternate = (bseclist[0]*30+240)%360
        if (Math.min(alternate%180,180-(alternate%180)) < Math.min(answer%180,180-(answer%180))) {answer = alternate;}
        return answer;
      case 2:
        if (Math.abs(banglelist[0] - banglelist[1]) > 180) {
          return (Math.floor((banglelist[0]+banglelist[1])/2))%360;
        } else {
          return (Math.floor((banglelist[0]+banglelist[1])/2)+180)%360;
        }
      case 3:
        if (!bseclist.includes(8) && !bseclist.includes(9)) {
          return 240;
        } else if (!bseclist.includes(2)) {
          return 60;
        } else {
          for (let i = 0; i < 12
            ; i++) {
            if (!bseclist.includes(i)) {
              return i*30;
            }
          }
        }
        return -1;
      default:
        return -1;
    }
  }

function bond (x1,y1,x2,y2,num) {
  line(x1,y1,x2,y2);
  if (num >= 2) {
    lineOffset(x1,y1,x2,y2,5);
    if (num === 3) {
      lineOffset(x1,y1,x2,y2,-5);
    }
  }
}

function countBonds (atom) {
  if (atom.length <= 4) {
    return 0;

  } else {

    let ans =
     0;
    for (let 
      i = 4; i < atom.length; i+=2) {
      ans += atom[i];
    }
    return ans;
  }
}

function isHydroxyl (atom) {
  return atom[1] === "O" && atom.length === 6 && countBonds(atom) === 1;
}

function isKetone (atom) { // is ketone or aldehyde
  return atom[1] === "O" && atom.length === 6 && countBonds(atom) === 2;
}
function mouseClicked() {
  switch (selectedBox) {
    case 1:
      bondType = selectedBox;
      bondMode = true;
      break;
    case 2:
      bondType = selectedBox;
      bondMode = true;
      break;
    case 3:
      bondType = selectedBox;
      bondMode = true;
      break;
    case 4:
      angleSnap = true;
      break;
    case 5:
      angleSnap = false;
      break;
    case 6:
      element = "C"
      bondMode = false;
      break;
    case 7:
      element = "O"
      bondMode = false;
      break;
    case 8:
      element = "N"
      bondMode = false;
      break;
    case 9:
      element = "Br"
      bondMode = false;
      break;
    case 10:
      element = "Cl"
      bondMode = false;
      break;
    case 11:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (isHydroxyl(currentAtom) && network[currentAtom[5]][1] === "C") {
          network[i][1] = -1; // remove OH from O. TODO: does not properly remove the atom, add checks to make sure that these atoms are ignored
          let adjacentAtom = network[currentAtom[5]]; // carbon atom that the oxygen is attached to
          let mostSubstitutedAtom = [];
          for (let j = 5; j < adjacentAtom.length; j+=2) { // look at the atoms attached to the adjacentAtom
            let adajacentAdjacentAtom = network[adjacentAtom[j]];
            if (adajacentAdjacentAtom[0] === i) { // ignore the currentAtom
              continue;
            }
            if (countBonds(adajacentAdjacentAtom) >= 3) { // can't dehydrate an OH attached to a triple bond
              break;
            }
            if (countBonds(adajacentAdjacentAtom) > countBonds(mostSubstitutedAtom)) {
              mostSubstitutedAtom = adajacentAdjacentAtom; // TODO: consider what happens when equally substituted
            }
          }
          if (mostSubstitutedAtom.length !== 0) {
            for (let j = 5; j < mostSubstitutedAtom.length; j+=2) { // TODO: make indexOf function for atoms
              if (mostSubstitutedAtom[j] === adjacentAtom[0]) {
                network[mostSubstitutedAtom[0]][j-1]++;
              }
            }
            for (let j = 5; j < adjacentAtom.length; j+=2) {
              if (adjacentAtom[j] === mostSubstitutedAtom[0]) {
                network[adjacentAtom[0]][j-1]++;
              } else if (adjacentAtom[j] === i) {
                network[adjacentAtom[0]].splice(j-1,2); // remove OH from C
                j -= 2; // adjust for shorter adjacentAtom
              }
            }
          }
        }
      }
      break;
    case 17:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        for (let j = 4; j < currentAtom.length; j+=2) {
          if (currentAtom[j] !== 1) {
            network[i][j] = 1;
          }
        }
      }
    case 20:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (isKetone(currentAtom) && network[currentAtom[5]][1] === "C") {
          network[i][4] = 1;
          for (let j = 4; j < network[currentAtom[5]].length; j++) {
            if (network[currentAtom[5]][j+1] === i) {
              network[currentAtom[5]][j] = 1;
            }
          }
        }
      }
      break;
    case 21:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (isHydroxyl(currentAtom) && network[currentAtom[5]][1] === "C") {
          network[i][4] = 2;
          for (let j = 4; j < network[currentAtom[5]].length; j++) {
            if (network[currentAtom[5]][j+1] === i) {
              network[currentAtom[5]][j] = 2;
            }
          }
        }
      }
      break;
    case 22:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (isHydroxyl(currentAtom) && network[currentAtom[5]][1] === "C") {
          network[i][1] = "Br";
        }
      }
      break;
    case 23:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (isHydroxyl(currentAtom) && network[currentAtom[5]][1] === "C") {
          network[i][1] = "Cl";
        }
      }
      break;
    case 24:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (isHydroxyl(currentAtom) && network[currentAtom[5]][1] === "C") {
          network[i][1] = "Ts";
        }
      }
      break;
    case 0: // when no box is selected
    if (bondMode) {
      element = "C";
      if (bondAngle === -1 || !validBond) {return false;} // -1 means invalid bond TODO: change this, bondAngle is not needed elsewhere
      
      let id1 = nextID;
      if (selectedAtom.length !== 0) {
        id1 = selectedAtom[0];
      } else {        
        nextID++;
      }
      let id2 = nextID;
      if (destinationAtom.length !== 0) {
        id2 = destinationAtom[0];
      } else {
        nextID++;
      }

      if (network.length<=id1) {
        network.push([id1, element, previewX1, previewY1, bondType, id2]); // TEMPORARY, CANNOT SUPPORT DELETION
      } else {
        network[id1].push(bondType, id2);
      }
      if (network.length<=id2) {
        network.push([id2, element, previewX2, previewY2, bondType, id1]); // TEMPORARY, CANNOT SUPPORT DELETION
      } else {
        network[id2].push(bondType, id1);
      }
      break;
    } else {
      if (selectedAtom.length !== 0) {
        network[selectedAtom[0]][1] = element;
      } else {
        network.push([nextID, element, previewX1, previewY1]);
        nextID++;
      }
    }
  }
  loop();
  return false;
}