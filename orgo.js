// Written by Joseph. github.com/OneRandomGithubUser
const bondLength = 50;
var bondAngle = 0;
var nextID = 0; // next atom ID
var bondType = 1;
var element = "C";
var reagents = "";
var bondMode = true;
var network = []; // atom id (int), atom element (string), atomX (number), atomY (number), bond1 type (number), bond1 destination atom id, etc.
// TODO: change atoms to a custom object
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
let previousWindowHeight = 0;
let previousWindowWidth = 0;
var previousMouseX = 0.0;
var previousMouseY = 0.0;
var angleSnap = true;
var validBond = true;
let background2;
let middleground;
let foreground;
var intro = true;
var renderFrame = false;
var renderMiddleground = false;
// TODO: bad practice to make so many global variables

let font;
function preload() {
  font = loadFont("./arial.ttf");
}

function setup() {
  // createCanvas must be the first statement
  // background2: static UI elements
  // middleground: background2, preexisting bonds, atoms, and dynamic UI elements
  // foreground: preview bond/atom, snap indicators
  windowWidth = Math.max(window.innerWidth,minWidth);
  windowHeight = Math.max(window.innerHeight,minHeight);
  createCanvas(windowWidth,windowHeight);
  textFont(font);
  middleground = createGraphics(windowWidth,windowHeight);
  background2 = createGraphics(windowWidth,windowHeight);
  foreground = createGraphics(windowWidth,windowHeight);
  background2.textAlign(CENTER, CENTER);
  background2.clear();
  drawbackground2();
  middleground.stroke(0); // Set line drawing color to black
  middleground.textSize(16);
  middleground.textAlign(CENTER, CENTER);
  foreground.textSize(16);
  foreground.textAlign(CENTER, CENTER);
  frameRate(60);
  console.log("Written by Joseph. github.com/OneRandomGithubUser");
}

function draw() {
  let cachedMouseX = mouseX;
  let cachedMouseY = mouseY;

  if (renderFrame) {
    clear();
    foreground.clear();

    // update UI once they are moused over
    if (cachedMouseY < 120 && cachedMouseY > 20) {
      if (cachedMouseX < 120 && cachedMouseX > 20) {
        selectBox(1); // single bond
      } else if (cachedMouseX < 240 && cachedMouseX > 140) {
        selectBox(2); // double bond
      } else if (cachedMouseX < 360 && cachedMouseX > 260) {
        selectBox(3); // triple bond
      } else if (cachedMouseX < 480 && cachedMouseX > 380) {
        selectBox(6); // C
      } else if (cachedMouseX < 600 && cachedMouseX > 500) {
        selectBox(7); // O
      } else if (cachedMouseX < 720 && cachedMouseX > 620) {
        selectBox(8); // N
      } else if (cachedMouseX < 840 && cachedMouseX > 740) {
        selectBox(9); // Br
      } else if (cachedMouseX < 960 && cachedMouseX > 860) {
        selectBox(10); // Cl
      } else if (cachedMouseY < 70) {
        if (cachedMouseX > windowWidth-120 && cachedMouseX < windowWidth-20) {
          selectBox(4); // FREEFORM BONDS
        } else if (cachedMouseX > windowWidth-240 && cachedMouseX < windowWidth-140) {
          selectBox(5); // SNAP BONDS
        } else if (cachedMouseX > windowWidth-360 && cachedMouseX < windowWidth-260) {
          selectBox(11); // CLEAR MOLECULE
        }
      }
    } else if (cachedMouseY > windowHeight-70 && cachedMouseY < windowHeight-20) {
      if (cachedMouseX < 360 && cachedMouseX > 260) {
        selectBox(21);
      } else if (cachedMouseX < 480 && cachedMouseX > 380) {
        selectBox(22);
      } else if (cachedMouseX < 600 && cachedMouseX > 500) {
        selectBox(23);
      } else if (cachedMouseX < 720 && cachedMouseX > 620) {
        selectBox(24);
      } else if (cachedMouseX < 840 && cachedMouseX > 740) {
        selectBox(25);
      } else if (cachedMouseX < 960 && cachedMouseX > 860) {
        selectBox(26);
      } else if (cachedMouseX < 1080 && cachedMouseX > 980) {
        selectBox(27);
      } else if (cachedMouseX < 1200 && cachedMouseX > 1100) {
        selectBox(28);
      } else if (cachedMouseX < 1320 && cachedMouseX > 1220) {
        selectBox(29);
      } else if (cachedMouseX < 1440 && cachedMouseX > 1340) {
        selectBox(30);
      } else if (cachedMouseX < 1560 && cachedMouseX > 1460) {
        selectBox(31);
      } else if (cachedMouseX < 1680 && cachedMouseX > 1580) {
        selectBox(32);
      } else if (cachedMouseX < 1800 && cachedMouseX > 1700) {
        selectBox(33);
      } else if (cachedMouseX < 1920 && cachedMouseX > 1820) {
        selectBox(34);
      }
    } else if (selectedBox != 0) {
      selectedBox = 0;
      renderMiddleground = true;
    }

    if (renderMiddleground) {
      // set draw attributes common to these buttons to speed up performance
      middleground.clear();
      middleground.image(background2, 0, 0, windowWidth, windowHeight);
      middleground.fill(230);

      // render bond button overlays
      bondButton(20,20,1);
      bondButton(140,20,2);
      bondButton(260,20,3);

      // render atom button overlays
      middleground.noFill();
      middleground.textSize(48);
      middleground.textStyle(NORMAL);
      atomButtonOverlay(380,20,"C",6);
      atomButtonOverlay(500,20,"O",7);
      atomButtonOverlay(620,20,"N",8);
      atomButtonOverlay(740,20,"Br",9);
      atomButtonOverlay(860,20,"Cl",10);

      // render angle snap button overlays
      middleground.textSize(16);
      middleground.textStyle(BOLD);
      angleSnapButtonOverlay(windowWidth-240,20,"SNAP BONDS",5);
      angleSnapButtonOverlay(windowWidth-120,20,"FREEFORM BONDS",4);

      // render clear button overlay
      clearButtonOverlay();
      
      // render reaction button overlays
      reactionButtonOverlay(260,windowHeight-70,"POCl₃",21);/*
      reactionButtonOverlay(380,windowHeight-70,"KOH",22);
      reactionButtonOverlay(500,windowHeight-70,"HBr",23);
      reactionButtonOverlay(620,windowHeight-70,"HBr, H₂O₂",24);
      reactionButtonOverlay(740,windowHeight-70,"Br₂",25);
      reactionButtonOverlay(860,windowHeight-70,"Br₂, H₂O",26);
      reactionButtonOverlay(980,windowHeight-70,"H₂, Pd",27);
      reactionButtonOverlay(1100,windowHeight-70,"Hg(OAc)₂,H₂O,BH₄",28);
      reactionButtonOverlay(1220,windowHeight-70,"BH₃",29);*/
      reactionButtonOverlay(1340,windowHeight-70,"NaBH₄",30);
      reactionButtonOverlay(1460,windowHeight-70,"Swern",31);
      reactionButtonOverlay(1580,windowHeight-70,"PBr₃",32);
      reactionButtonOverlay(1700,windowHeight-70,"SOCl₂",33);
      reactionButtonOverlay(1820,windowHeight-70,"TsCl",34);

      middleground.textStyle(NORMAL);
      middleground.stroke(0);
      middleground.fill(0);
    }

    if (!mousePressed) {selectedAtom = [];} // selected atom when snap-on is in effect
    closestDistance = selectionDistance;
    validBond = true;

    // cycle through all atoms
    for (let i = 0; i < network.length; i++) {
      let currentAtom = network[i];

      if (renderMiddleground) {
        middleground.textSize(20);

        // render preexisting bonds
        if (countBonds(currentAtom) !== 0) {
          for (let j = 4; j < currentAtom.length; j+=2) {
            if (currentAtom[j+1] > currentAtom[0]) {
              bond(currentAtom[2], currentAtom[3], network[currentAtom[j+1]][2], network[currentAtom[j+1]][3], currentAtom[j],middleground);
            }
          }
        }
        
        // render preexisting atoms
        middleground.noStroke();
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
              case 3:
                label = "O⁺"
                break;
              case 4:
                label = "O²⁺"
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
              case 4:
                label = "N⁺"
                break;
            }
          }
          if (label !== "") {
            middleground.fill(255);
            let boundingBox = font.textBounds(label, currentAtom[2], currentAtom[3], 20, CENTER, CENTER);
            middleground.rect(boundingBox.x-5-boundingBox.w/2, boundingBox.y-5, boundingBox.w+10, boundingBox.h+10); // TODO: figure out why this is so weird
            middleground.fill(0);
            middleground.text(label, currentAtom[2], currentAtom[3]);
          }
        }
        middleground.stroke(0);
      }

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
        foreground.fill(255,0,0);
        validBond = false;
      } else {
        foreground.fill(48,227,255);
        validBond = true;
      }
      foreground.circle(selectedAtom[2],selectedAtom[3],10);
      foreground.fill(255);
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
          foreground.fill(48,227,255);
          foreground.circle(destinationAtom[2],destinationAtom[3],10);
          foreground.fill(255);
          previewX2 = destinationAtom[2];
          previewY2 = destinationAtom[3];
          bondAngle = findBondAngle(previewX1,previewY1,previewX2,previewY2);
        } else {
          foreground.fill(255,0,0);
          foreground.circle(destinationAtom[2],destinationAtom[3],10);
          foreground.fill(255);
          previewX2 = destinationAtom[2];
          previewY2 = destinationAtom[3];
          bondAngle = -1;
        }
      }
    }

    // draw preview
    if (!bondMode) {
      foreground.rectMode(CENTER);
      foreground.fill(0);
      foreground.noStroke();
      foreground.textSize(20);
      foreground.text(element, previewX1, previewY1);
      foreground.fill(255);
      foreground.stroke(0);
      foreground.rectMode(CORNER);
    } else if (validBond) {
      bond(previewX1, previewY1, previewX2, previewY2, bondType, foreground);
    }

    if (renderMiddleground) {
      renderMiddleground = false;
    }
  
    // copy middleground to screen
    image(middleground, 0, 0, windowWidth, windowHeight);
    image(foreground, 0, 0, windowWidth, windowHeight);
  }

  // determine whether or not to render the next frame
  if (intro) {
    if (frameCount < 120) {
      foreground.stroke(255);
      if (frameCount > 60) {
        foreground.fill(255,255-(frameCount-60)/60*255);
        foreground.rect(0,0,windowWidth,windowHeight);
        foreground.fill(0,255-(frameCount-60)/60*255);
      } else {      
        foreground.fill(255);
        foreground.rect(0,0,windowWidth,windowHeight);
        foreground.fill(0);
      }
      if (frameCount === 60) {
        renderFrame = true;
        renderMiddleground = true;
      }
      foreground.textSize(144);
      foreground.text("KyneDraw",0,windowHeight/2,windowWidth);
      foreground.stroke(0);
    } else if (frameCount === 120) {
      intro = false;
    }
  } else {
  // pause rendering during inactivity and when not in intro
    if (previousMouseX === cachedMouseX && previousMouseY === mouseY) {
      renderFrame = false;
    } else {
      previousMouseX = cachedMouseX;
      previousMouseY = cachedMouseY;
    }
  }
}

function mouseDragged() {
  renderFrame = true;
  mousePressed = true;
}

function mouseMoved() {
  renderFrame = true;
  return false;
}

function mouseReleased() {
  renderFrame = true;
  mousePressed = false;
}

function toRadians (angle) {
  return angle * (Math.PI/180);
}

function toDegrees (angle) {
  return angle * (180/Math.PI);
}

function selectBox (id) {
  if (selectedBox != id) {
    selectedBox = id;
    renderMiddleground = true;
  } 
}

function lineOffset (x1,y1,x2,y2,offset,frame) {
  let angle = findBondAngle(x1,y1,x2,y2);
  frame.line(x1-Math.sin(toRadians(angle))*offset, y1-Math.cos(toRadians(angle))*offset, x2-Math.sin(toRadians(angle))*offset, y2-Math.cos(toRadians(angle))*offset);
}

function angleSnapButton(x,y,label,box) {
  background2.fill(230);
  background2.rect(x,y,100,50);
  background2.fill(0);
  background2.text(label,x,y,100,50);
}

function angleSnapButtonOverlay(x,y,label,box) {
  if (selectedBox === box) {
    middleground.stroke(255);
    middleground.rect(x,y,100,50);
    middleground.noStroke();
    middleground.text(label,x,y,100,50);
    middleground.stroke(0);
    middleground.noFill();
  } else if (angleSnap && box === 5 || !angleSnap && box === 4) {
    middleground.fill(205);
    middleground.rect(x,y,100,50);
    middleground.noStroke();
    middleground.fill(0);
    middleground.text(label,x,y,100,50);
    middleground.stroke(0);
    middleground.noFill();
  } else {
    middleground.rect(x,y,100,50);
  }
}

function clearButton() {
  background2.fill(230);
  background2.rect(windowWidth-360,20,100,50);
  background2.fill(0);
  background2.text("CLEAR",windowWidth-360,20,100,50);
}

function clearButtonOverlay() {
  if (selectedBox === 11) {
    middleground.stroke(255);
    middleground.rect(windowWidth-360,20,100,50);
    middleground.stroke(0);
  } else {
    middleground.rect(windowWidth-360,20,100,50);
  }
}

function bondButton (x,y,bonds) { // does not need an overlay version because lines are very fast to render
  if (bondType === bonds && bondMode) {
    middleground.fill(205);
  }
  if (selectedBox === bonds) {
    middleground.stroke(255);
    middleground.rect(x,y,100,100);
    middleground.stroke(0);
  } else {
    middleground.rect(x,y,100,100);
  }
  if (bondType === bonds && bondMode) {
    middleground.fill(230);
  }
  bond(x+50-Math.cos(toRadians(30))*bondLength/2,y+50-Math.sin(toRadians(30))*bondLength/2,x+50+Math.cos(toRadians(30))*bondLength/2,y+50+Math.sin(toRadians(30))*bondLength/2,bonds,middleground);
}

function atomButton (x,y,atom,box) {
  background2.fill(230);
  background2.rect(x,y,100,100);
  background2.fill(0);
  background2.text(atom,x,y,100,100);
}

function atomButtonOverlay (x,y,atom,box) {
  if (selectedBox === box) {    
    middleground.stroke(255);
    if (element === atom && !bondMode) {
      middleground.fill(205);
    }
    middleground.rect(x,y,100,100);
    middleground.noStroke();
    middleground.fill(0);
    middleground.text(atom,x,y,100,100);
    middleground.stroke(0);
    middleground.noFill();
  } else if (element === atom && !bondMode) {
    middleground.fill(205);
    middleground.rect(x,y,100,100);
    middleground.noStroke();
    middleground.fill(0);
    middleground.text(atom,x,y,100,100);
    middleground.stroke(0);
    middleground.noFill();
  } else {
    middleground.rect(x,y,100,100);
  }
}

function reactionButton (x,y,reaction,box) {
  background2.fill(230);
  background2.rect(x,y,100,50);
  background2.fill(0);
  background2.text(reaction,x,y,100,50);
}

function reactionButtonOverlay (x,y,reaction,box) {
  if (selectedBox === box) {
    middleground.stroke(255);
    middleground.rect(x,y,100,50);
  } else {
    middleground.stroke(0);
    middleground.rect(x,y,100,50);
  }
}

function windowResized() {
  drawbackground2();
}

function drawbackground2() {
  if (windowWidth != Math.max(window.innerWidth-20,minWidth) || windowHeight != Math.max(window.innerHeight-20,minHeight)) {
    windowWidth = Math.max(window.innerWidth-20,minWidth);
    windowHeight = Math.max(window.innerHeight-20,minHeight);
    resizeCanvas(windowWidth,windowHeight);
    var newGraphics = createGraphics(windowWidth,windowHeight);
    newGraphics.image(background2, 0, 0, newGraphics.width, newGraphics.height);
    background2 = newGraphics;
    background2.textAlign(CENTER, CENTER);
    var newGraphics = createGraphics(windowWidth,windowHeight);
    newGraphics.image(middleground, 0, 0, newGraphics.width, newGraphics.height);
    middleground = newGraphics;
    middleground.textAlign(CENTER, CENTER);
    var newGraphics = createGraphics(windowWidth,windowHeight);
    newGraphics.image(foreground, 0, 0, newGraphics.width, newGraphics.height);
    foreground = newGraphics;
    foreground.textAlign(CENTER, CENTER);
  }
  renderFrame = true;
  renderMiddleground = true;

  background2.clear();
  background2.noStroke();
  background2.textSize(48);
  atomButton(380,20,"C",6);
  atomButton(500,20,"O",7);
  atomButton(620,20,"N",8);
  atomButton(740,20,"Br",9);
  atomButton(860,20,"Cl",10);
  background2.textSize(16);
  background2.textStyle(BOLD);
  reactionButton(260,windowHeight-70,"POCl₃",21);/*
  reactionButton(380,windowHeight-70,"KOH",22);
  reactionButton(500,windowHeight-70,"HBr",23);
  reactionButton(620,windowHeight-70,"HBr, H₂O₂",24);
  reactionButton(740,windowHeight-70,"Br₂",25);
  reactionButton(860,windowHeight-70,"Br₂, H₂O",26);
  reactionButton(980,windowHeight-70,"H₂, Pd",27);
  reactionButton(1100,windowHeight-70,"Hg(OAc)₂,H₂O,BH₄",28);
  reactionButton(1220,windowHeight-70,"BH₃",29);*/
  reactionButton(1340,windowHeight-70,"NaBH₄",30);
  reactionButton(1460,windowHeight-70,"Swern",31);
  reactionButton(1580,windowHeight-70,"PBr₃",32);
  reactionButton(1700,windowHeight-70,"SOCl₂",33);
  reactionButton(1820,windowHeight-70,"TsCl",34);
  clearButton();
  angleSnapButton(windowWidth-240,20,"SNAP BONDS",5);
  angleSnapButton(windowWidth-120,20,"FREEFORM BONDS",4);
  background2.stroke(0);
  background2.textStyle(NORMAL);
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

function bond (x1,y1,x2,y2,num,frame) {
  frame.line(x1,y1,x2,y2);
  if (num >= 2) {
    lineOffset(x1,y1,x2,y2,5,frame);
    if (num === 3) {
      lineOffset(x1,y1,x2,y2,-5,frame);
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
      angleSnap = false;
      break;
    case 5:
      angleSnap = true;
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
      network = [];
      nextID = 0;
      break;
    case 21:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (isHydroxyl(currentAtom) && network[currentAtom[5]][1] === "C") {
          let adjacentAtom = network[currentAtom[5]]; // carbon atom that the oxygen is attached to
          let mostSubstitutedAtom = [];
          for (let j = 5; j < adjacentAtom.length; j+=2) { // look at the atoms attached to the adjacentAtom
            let adajacentAdjacentAtom = network[adjacentAtom[j]];
            if (adajacentAdjacentAtom[0] === i) { // ignore the currentAtom
              continue;
            }
            if (countBonds(adajacentAdjacentAtom) > 3) { // can't make another bond on a carbon with a full octet
              continue;
            }
            if (countBonds(adajacentAdjacentAtom) > countBonds(mostSubstitutedAtom)) {
              mostSubstitutedAtom = adajacentAdjacentAtom; // TODO: consider what happens when equally substituted
            }
          }
          if (mostSubstitutedAtom.length !== 0) {
            network[i][1] = -1; // remove OH from O. TODO: does not properly remove the atom, add checks to make sure that these atoms are ignored
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
    case 27:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        for (let j = 4; j < currentAtom.length; j+=2) {
          if (currentAtom[j] !== 1) {
            network[i][j] = 1;
          }
        }
      }
    case 30:
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
    case 31:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (isHydroxyl(currentAtom) && network[currentAtom[5]][1] === "C" && countBonds(network[currentAtom[5]]) < 4) {
          network[i][4] = 2;
          for (let j = 4; j < network[currentAtom[5]].length; j++) {
            if (network[currentAtom[5]][j+1] === i) {
              network[currentAtom[5]][j] = 2;
            }
          }
        }
      }
      break;
    case 32:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (isHydroxyl(currentAtom) && network[currentAtom[5]][1] === "C") {
          network[i][1] = "Br";
        }
      }
      break;
    case 33:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (isHydroxyl(currentAtom) && network[currentAtom[5]][1] === "C") {
          network[i][1] = "Cl";
        }
      }
      break;
    case 34:
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
  renderFrame = true;
  renderMiddleground = true;
  return false;
}