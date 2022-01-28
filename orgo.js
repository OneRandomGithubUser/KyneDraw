// Written by Joseph. github.com/OneRandomGithubUser
const bondLength = 50;
var bondAngle = 0;
var atoms = []; // list of the atom ID and then its two coordinates and then its element
var nextID = 0; // next atom ID
var bondType = 1;
var element = "C";
var reagents = "";
var bondMode = true;
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
var selectedBox = 0;
const minWidth = 1920;
const minHeight = 210;
let windowHeight = 0;
let windowLength = 0;
var cachedMouseX = 0.0;
var cachedMouseY = 0.0;
var angleSnap = false;

function setup() {
  // createCanvas must be the first statement
  createCanvas(window.innerWidth-16,window.innerHeight-20);
  stroke(0); // Set line drawing color to black
  frameRate(60);
  console.log("Written by Joseph. github.com/OneRandomGithubUser");
}

function draw() {
  windowWidth = Math.max(window.innerWidth-16,minWidth);
  windowHeight = Math.max(window.innerHeight-20,minHeight);
  resizeCanvas(windowWidth,windowHeight);
  background(255); // Set the background to white

  // draw UI
  fill(230);
  selectedBox = 0;
  if (mouseY < 120 && mouseY > 20) {
    if (mouseX < 120 && mouseX > 20) {
      selectedBox = 1; // single bond
    } else if (mouseX < 240 && mouseX > 140) {
      selectedBox = 2; // double bond
    } else if (mouseX < 360 && mouseX > 260) {
      selectedBox = 3; // triple bond
    } else if (mouseX < 480 && mouseX > 380) {
      selectedBox = 6; // C
    } else if (mouseX < 600 && mouseX > 500) {
      selectedBox = 7; // O
    } else if (mouseX < 720 && mouseX > 620) {
      selectedBox = 8; // N
    } else if (mouseX < 840 && mouseX > 740) {
      selectedBox = 9; // Br
    } else if (mouseX < 960 && mouseX > 860) {
      selectedBox = 10; // Cl
    }
  }
  if (mouseY > windowHeight-70 && mouseY < windowHeight-20) {
    if (mouseX < 120 && mouseX > 20) {
      selectedBox = 4;
    } else if (mouseX < 240 && mouseX > 140) {
      selectedBox = 5;
    } else if (mouseX < 360 && mouseX > 260) {
      selectedBox = 11; // HBr
    } else if (mouseX < 480 && mouseX > 380) {
      selectedBox = 12; // HBr, H₂O₂
    } else if (mouseX < 600 && mouseX > 500) {
      selectedBox = 13; // Br₂
    } else if (mouseX < 720 && mouseX > 620) {
      selectedBox = 14; // Br₂, H₂O
    } else if (mouseX < 840 && mouseX > 740) {
      selectedBox = 15; // H₂, Pd
    } else if (mouseX < 960 && mouseX > 860) {
      selectedBox = 16; // CH₂I₂
    } else if (mouseX < 1080 && mouseX > 980) {
      selectedBox = 17; // Hg(OAc)₂,H₂O,BH₄
    } else if (mouseX < 1200 && mouseX > 1100) {
      selectedBox = 18; // BH₃
    } else if (mouseX < 1320 && mouseX > 1220) {
      selectedBox = 19; // m-CPBA
    } else if (mouseX < 1440 && mouseX > 1340) {
      selectedBox = 20; // OsO₄, H₂O
    } else if (mouseX < 1560 && mouseX > 1460) {
      selectedBox = 21;
    } else if (mouseX < 1680 && mouseX > 1580) {
      selectedBox = 22;
    } else if (mouseX < 1800 && mouseX > 1700) {
      selectedBox = 23;
    } else if (mouseX < 1920 && mouseX > 1820) {
      selectedBox = 24;
    } // TODO: fix the comments above
  }
  bondButton(20,20,1);
  bondButton(140,20,2);
  bondButton(260,20,3);

  if (angleSnap) {
    fill(205);
  }
  if (selectedBox === 4) {
    stroke(255);
    rect(20,windowHeight-70,100,50);
    stroke(0);
  } else {
    rect(20,windowHeight-70,100,50);
  }
  fill(0);
  textAlign(CENTER);
  textSize(16);
  text("SNAP ANGLES",20,windowHeight-70,100,50);
  fill(230);

  if (!angleSnap) {
    fill(205);
  }
  if (selectedBox === 5) {
    stroke(255);
    rect(140,windowHeight-70,100,50);
    stroke(0);
  } else {
    rect(140,windowHeight-70,100,50);
  }
  fill(0);
  textAlign(CENTER); // TODO: change this to (CENTER,CENTER) once version 1.4.1 of p5.js is released on January 31, 2022
  textSize(16);
  text("FREEFORM ANGLES",140,windowHeight-70,100,50);
  fill(230);

  atomButton(380,20,"C",6);
  atomButton(500,20,"O",7);
  atomButton(620,20,"N",8);
  atomButton(740,20,"Br",9);
  atomButton(860,20,"Cl",10);

  if (selectedBox === 11) {
    stroke(255);
    rect(260,windowHeight-70,100,50);
    stroke(0);
  } else {
    rect(260,windowHeight-70,100,50);
  }
  fill(0);
  textAlign(CENTER);
  textSize(16);
  text("SNAP ANGLES",260,windowHeight-70,100,50);
  fill(230);
  
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

  // render preexisting bonds
  for (let i = 0; i < bonds.length; i++) {
    let currentBond = bonds[i];
    let atom1 = atoms[currentBond[1]];
    let atom2 = atoms[currentBond[2]];
    line(atom1[1], atom1[2], atom2[1], atom2[2]);
    if (currentBond[0]===2||currentBond[0]===3) {
      {lineOffset(atom1[1], atom1[2], atom2[1], atom2[2], currentBond[3], 5);}
      if (currentBond[0]===3) {lineOffset(atom1[1], atom1[2], atom2[1], atom2[2], currentBond[3], -5);}
    }
  }

  // render preexisting atoms
  fill(255);
  stroke(255);
  textAlign(CENTER);
  textSize(22);
  for (let i = 0; i < atoms.length; i++) {
    let currentAtom = atoms[i];
    if (currentAtom[3] !== "C") {
      circle(currentAtom[1],currentAtom[2],20);
      fill(0);
      text(currentAtom[3],currentAtom[1]-10,currentAtom[2]-10,20,30);
      fill(255);
    }
  }
  fill(0);
  stroke(0);

  // calculate closest selected atom
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
  if (selectedAtom.length !== 0 && !mousePressed && bondMode) { // selectedAtom is previously defined in cyan selection dot area
    let currentBondSectors = []; // ranges from 0 to 11 for each 30 degree sector
    let currentBondAngles = [];
    let currentNetwork = network[selectedAtom[0]];
    for (let i = 3; i < currentNetwork.length; i+=3) {
      currentBondAngles.push(currentNetwork[i]);
      currentBondSectors.push(Math.floor(currentNetwork[i]/30));
    }
    switch (currentBondSectors.length) {
      case 1:
        let answer = (currentBondSectors[0]*30+120)%360
        let alternate = (currentBondSectors[0]*30+240)%360
        if (Math.min(alternate%180,180-(alternate%180)) < Math.min(answer%180,180-(answer%180))) {answer = alternate;}
        bondAngle = answer;
        break;
      case 2:
        if (Math.abs(currentBondAngles[0] - currentBondAngles[1]) > 180) {
          bondAngle = (Math.floor((currentBondAngles[0]+currentBondAngles[1])/2))%360;
        } else {
          bondAngle = (Math.floor((currentBondAngles[0]+currentBondAngles[1])/2)+180)%360;
        }
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
    if (angleSnap) {
      bondAngle = Math.floor((findBondAngle(previewX1,previewY1,mouseX,mouseY)+15)/30)*30 // round bond angle to nearest 30 degrees
      previewX2 = previewX1 + Math.cos(toRadians(360-bondAngle))*bondLength;
      previewY2 = previewY1 + Math.sin(toRadians(360-bondAngle))*bondLength;
    } else {
      previewX2 = mouseX;
      previewY2 = mouseY;
      bondAngle = findBondAngle(previewX1,previewY1,mouseX,mouseY);
    }
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

  if (bondMode) {
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
      bondAngle = findBondAngle(previewX1,previewY1,previewX2,previewY2);
    }

    // draw preview bond
    if (bondAngle !== -1) {
      line(previewX1, previewY1, previewX2, previewY2);
      if (bondType === 2 || bondType === 3) {
        lineOffset(previewX1, previewY1, previewX2, previewY2, bondAngle, 5);
        if (bondType === 3) {lineOffset(previewX1, previewY1, previewX2, previewY2, bondAngle,-5);}
      }
    }
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
    textAlign(CENTER);
    text("KyneDraw",0,windowHeight/2,windowWidth);
    stroke(0);
  } else {
    if (cachedMouseX === mouseX && cachedMouseY === mouseY) {
      noLoop();
    } else {
      cachedMouseX = mouseX;
      cachedMouseY = mouseY;
    }
  }
  console.log("active");
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
    default: // when no box is selected
      if (bondMode) {
        if (bondAngle === -1) {return false;} // -1 means invalid bond
        let id1 = nextID;
        if (selectedAtom.length !== 0) {
          id1 = selectedAtom[0];
        }
        if (network.length<=id1) {
          network.push([id1, bondType, nextID+1, (360+bondAngle)%360]); // TEMPORARY, CANNOT SUPPORT DELETION
        } else {
          network[id1].push(bondType, nextID+1, (360+bondAngle)%360);
        }
        if (selectedAtom.length === 0) {
          atoms.push([id1, previewX1, previewY1, "C"]); // TODO: add support for changing element of new atoms
          nextID++;
        }

        let id2 = nextID;
        if (destinationAtom.length !== 0) {
          id2 = destinationAtom[0];
        }
        if (network.length<=id2) {
          network.push([id2, bondType, id1, (360+bondAngle)%360]); // TEMPORARY, CANNOT SUPPORT DELETION
        } else {
          network[id2].push(bondType, id1, (360+bondAngle)%360);
        }
        console.log(network);
        if (destinationAtom.length === 0) {
          atoms.push([id2, previewX2, previewY2, "C"]);
          nextID++;
        }
        bonds.push([bondType, id1, id2, bondAngle]);
        break;
      } else {
        atoms[selectedAtom[0]][3] = element;
      }
  }
  loop();
  return false;
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

function lineOffset (x1,y1,x2,y2,angle,offset) {
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
    lineOffset(x+50-Math.cos(toRadians(30))*bondLength/2,y+50-Math.sin(toRadians(30))*bondLength/2,x+50+Math.cos(toRadians(30))*bondLength/2,y+50+Math.sin(toRadians(30))*bondLength/2,330,5);
    if (bonds > 2) {
      lineOffset(x+50-Math.cos(toRadians(30))*bondLength/2,y+50-Math.sin(toRadians(30))*bondLength/2,x+50+Math.cos(toRadians(30))*bondLength/2,y+50+Math.sin(toRadians(30))*bondLength/2,330,-5);
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
  textAlign(CENTER);
  textSize(48);
  text(atom,x,y,100,100);
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
  textAlign(CENTER);
  textSize(16);
  text(reaction,x,y,100,50);
  fill(230);
}


function findBondAngle (x1,y1,x2,y2) {
  let ans = toDegrees(Math.atan(-(y2-y1)/(x2-x1)));
  if (ans < 0) {ans+=180;}
  if (-(y2-y1) < 0) {ans = (180+ans)%360;}
  return ans;
}