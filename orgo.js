// Written by Joseph. github.com/OneRandomGithubUser
const BOND_LENGTH = 50;
var nextNodeID = 0;
var nextMoleculeID = 0;
var bondType = 1;
var element = "C";
var reagents = "";
var selectedTool = "bond";
var network = []; // array of Atom objects
var molecules = []; // array of Molecule objects
// TODO: make the network into a Map?
var closestDistance = 0; // 20 is the maximum distance for selection
var selectedAtom = []; // selected atom when snap-on is in effect
var destinationAtom = [];
var previewX1 = 0;
var previewY1 = 0;
var previewX2 = 0;
var previewY2 = 0;
const SELECTION_DISTANCE = 15;
const DESTINATION_DISTANCE = 5;
var mousePressed = false;
var selectedBox = 0;
const MIN_WIDTH = 995;
const MIN_HEIGHT = 715;
let windowHeight = 0;
let windowLength = 0;
let previousWindowHeight = 0;
let previousWindowWidth = 0;
var previousMouseX = 0.0;
var previousMouseY = 0.0;
var angleSnap = true;
var validAction = true;
let middleground;
let foreground;
var intro = true;
var renderFrame = false;
var renderMiddleground = false;
var tip;
var hackerman = false;
var selectedBond = [];
var selectedMolecule = [];
var somethingClicked = false;
var buttonClicked = false;
const POSSIBLE_ELEMENTS = ["C", "O", "N", "Br", "Cl", "S", "I", "F"];
const INTRO_FADE_START_FRAME = 60;
const INTRO_FADE_END_FRAME = 120;
const MULTIBOND_SEPARATION = 6;
var tips = [
  "Press the CLEAR button to clear all atoms on the screen",
  "Press the SNAP BONDS or FREEFORM BONDS to change the way bonds are made when clicking and dragging",
  "Click and drag to make a custom bond",
  "Click on an element button to change into atom addition mode",
  "Click on a bond button to change into bond addition mode",
  "This website is powered by p5.js",
  "Click on a reagent button to simulate a reaction",
  "This is a very simplified view of organic chemistry, don't expect this program to know everything",
  "Snap onto preexisting atoms to make bonds from that atom or to change the element of that atom",
  "This website's code is open source - check out the code!",
  "This web app does not yet support stereochemistry, resonance, or E-Z configuration"
];
// TODO: bad practice to make so many global variables, but p5.js leaves me no choice

// define the Node class, which is to be used for either Atoms or FunctionalGroups
class Node {
  constructor(id,name,x,y,numBonds,charge,numH,numLoneE,deleted,predictedNextBondAngleList,bondIdList,bondTypeList,moleculeID) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.deleted = deleted;
    this.numBonds = numBonds;
    this.charge = charge;
    this.numH = numH;
    this.numLoneE = numLoneE;
    this.predictedNextBondAngleList = predictedNextBondAngleList;
    this.bondIdList = bondIdList;
    this.bondTypeList = bondTypeList;
    this.moleculeID = moleculeID;
    this.length = -1; // because length doesn't make sense for a functional group
  }

  clearData() {
    if (!this.deleted) {
      throw new Error("tried to clear data of nondeleted node");
    }
    this.id = null;
    this.name = null;
    this.x = null;
    this.y = null;
    this.numBonds = null;
    this.charge = null;
    this.numH = null;
    this.numLoneE = null;
    this.predictedNextBondAngleList = null;
    this.bondIdList = null;
    this.bondTypeList = null;
    this.moleculeID = null;
  }
  
  alkeneAdditionOf(markovnikovElementToAdd, nonmarkovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd = 1, optionalNonmarkovnikovNumBondsToAdd = 1) {
    if (this.name != "C" || this.isBenzene()) {
      // current element must be a carbon and not part of a benzene ring
      return false;
    } else {
      let changed = false;
      for (let i = 0; i < this.bondTypeList.length; i++) {
        let reps = this.bondTypeList[i]-1; // number of times to repeat bond addition. reps = 1 if alkene, reps = 2 if alkyne
        if (reps === 1 || reps === 2) { // find the alkene/alkyne(s)
          let atom2 = network[this.bondIdList[i]];
          if (atom2.name === "C") {
            this.bondTypeList[i] -= reps;
            this.changeNumBonds(-reps);
            this.updateNextBondAngleList();
            for (let j = 0; j < atom2.bondIdList.length; j++) {
              if (atom2.bondIdList[j] === this.id) {
                atom2.bondTypeList[j] -= reps;
                atom2.changeNumBonds(-reps);
              }
            }
            atom2.updateNextBondAngleList();
            if (this.isMoreStableCarbocationThan(atom2)) {
              for (let j = 0; j < reps; j++) {
                if (markovnikovElementToAdd != "") {
                  this.insertAtom(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
                }
                if (nonmarkovnikovElementToAdd != "") {
                  atom2.insertAtom(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
                }
              }
            } else {
              for (let j = 0; j < reps; j++) {
                if (nonmarkovnikovElementToAdd != "") {
                  this.insertAtom(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
                }
                if (markovnikovElementToAdd != "") {
                  atom2.insertAtom(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
                }
              }
            }
            changed = true;
          }
        }
      }
      return changed;
    }
  }
  
  alkyneAdditionOf(markovnikovElementToAdd, nonmarkovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd = 1, optionalNonmarkovnikovNumBondsToAdd = 1) {
    if (this.name != "C") {
      // current element must be a carbon
      return false;
    } else {
      let changed = false;
      for (let i = 0; i < this.bondTypeList.length; i++) {
        if (this.bondTypeList[i] === 3) {
          let atom2 = network[this.bondIdList[i]];
          if (atom2.name === "C") {
            this.bondTypeList[i]-=2;
            this.changeNumBonds(-2);
            this.updateNextBondAngleList();
            for (let j = 0; j < atom2.bondIdList.length; j++) {
              if (atom2.bondIdList[j] === this.id) {
                atom2.bondTypeList[j]-=2;
                atom2.changeNumBonds(-2);
              }
            }
            atom2.updateNextBondAngleList();
            if (this.isMoreStableCarbocationThan(atom2)) {
              if (markovnikovElementToAdd != "") {
                this.insertAtom(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
              }
              if (nonmarkovnikovElementToAdd != "") {
                atom2.insertAtom(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
              }
            } else {
              if (nonmarkovnikovElementToAdd != "") {
                this.insertAtom(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
              }
              if (markovnikovElementToAdd != "") {
                atom2.insertAtom(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
              }
            }
            changed = true;
          }
        }
      }
      return changed;
    }
  }

  insertAtom(element, bondType, connectToExistingAtoms, optionalBondAngle) {
    if (bondType + this.numBonds > maxBonds(this.name) || bondType > maxBonds(element)) {
      // bond makes too many bonds for a valid molecule
      return false;
    } else {
      let bondAngle;
      if (optionalBondAngle === undefined) {
        bondAngle = this.predictedNextBondAngleList[bondType-1];
      } else {
        bondAngle = optionalBondAngle;
      }
      let closestDestinationAtom = [];
      let previewX2 = this.x + Math.cos(toRadians(360-bondAngle))*BOND_LENGTH;
      let previewY2 = this.y + Math.sin(toRadians(360-bondAngle))*BOND_LENGTH;
      let id2 = nextNodeID;
      // connect to an existing atom, ignoring element
      closestDestinationAtom = findClosestDestinationAtom(previewX2,previewY2,[],network);
      if (closestDestinationAtom.length !== 0) {
        if (connectToExistingAtoms && closestDestinationAtom.numBonds + bondType < maxBonds(closestDestinationAtom.name)) {
          // if connectToExistingAtoms is true and the bondType is not too big to addition to the closestDestinationAtom, make the bond to it
          this.createBondWith(closestDestinationAtom, bondType);

          // then update the frame
          renderFrame = true;
          renderMiddleground = true;
          return true;
        } else {
          // if connectToExistingAtoms is false, make the new bond somewhere else by simulating the next bond as if there were simBonds already on the atom
          let simBonds = this.numBonds + 1;
          while (simBonds < 12) {
            bondAngle = this.calculateNextBondAngle(bondType, simBonds);
            previewX2 = this.x + Math.cos(toRadians(360-bondAngle))*BOND_LENGTH;
            previewY2 = this.y + Math.sin(toRadians(360-bondAngle))*BOND_LENGTH;
            closestDestinationAtom = findClosestDestinationAtom(previewX2,previewY2,[],network);
            if (closestDestinationAtom.length === 0) {
              break;
            }
            simBonds++;
          }
        }
      }
      network.push(new Atom(id2, element, previewX2, previewY2, 0, 0, valenceOf(element), valenceElectronsOf(element) - valenceOf(element), false, [], [], [], -1, []));
      nextNodeID++;
      this.createBondWith(network[id2], bondType);

      // then update the frame
      renderFrame = true;
      renderMiddleground = true;
      return true;
    }
  }
  
  // TODO: maybe make this work with bonds that are not bridges? would need some more advanced logic
  /**
   * Rotates the branch at Node this, including Node this if optionalRotateThis is true, about Node atom2 by Number degrees. Returns false and does nothing if the bond between the atoms is not a bridge
   * @param {Node} atom2 
   * @param {Number} degrees
   * @returns {Boolean} 
   */
  rotateBranchAboutBondWith(atom2,degrees,optionalRotateAboutAtom2 = true) {
    let branch = molecules[this.moleculeID].calculateBranch(this,atom2);
    if (branch.size === 0) {
      return false;
    } else {
      let rotateAxisAtom;
      if (optionalRotateAboutAtom2) {
        rotateAxisAtom = atom2;
      } else {
        branch.delete(this);
        rotateAxisAtom = this;
      }
      // change positions
      for (let currentAtom of branch) {
        currentAtom.x -= rotateAxisAtom.x;
        currentAtom.y -= rotateAxisAtom.y;
        let s = sin(toRadians(360-degrees));
        let c = cos(toRadians(360-degrees));
        let newX = currentAtom.x * c - currentAtom.y * s;
        let newY = currentAtom.y * c + currentAtom.x * s;
        currentAtom.x = newX + rotateAxisAtom.x;
        currentAtom.y = newY + rotateAxisAtom.y;
      }
      // loop again to update next bond angles
      for (let currentAtom of branch) {
        currentAtom.updateNextBondAngleList();
      }
      atom2.updateNextBondAngleList();
      if (optionalRotateAboutAtom2) {
        this.updateNextBondAngleList();
      }
      return true;
    }
  }

  createBondWith(atom2, bondType) {
    this.bondIdList.push(atom2.id);
    atom2.bondIdList.push(this.id);
    this.bondTypeList.push(bondType);
    atom2.bondTypeList.push(bondType);
    this.changeNumBonds(bondType);
    atom2.changeNumBonds(bondType);
    this.updateNextBondAngleList();
    atom2.updateNextBondAngleList();
    this.updateFunctionalGroup(atom2, bondType);
    // update the molecule data as necessary
    if (this.moleculeID === -1) {
      // if the moleculeID is -1, then it is not in any molecule yet
      if (atom2.moleculeID === -1) {
        this.moleculeID = nextMoleculeID;
        atom2.moleculeID = nextMoleculeID;
        molecules.push(new Molecule(nextMoleculeID, Math.min(this.x,atom2.x), Math.min(this.y,atom2.y), Math.max(this.x,atom2.x), Math.max(this.y,atom2.y), false, [this.id, atom2.id]));
        nextMoleculeID++;
      } else {
        molecules[atom2.moleculeID].addNewAtom(this);
      }
    } else {
      if (atom2.moleculeID === -1) {
        molecules[this.moleculeID].addNewAtom(atom2);
      } else {
        if (this.moleculeID !== atom2.moleculeID) {
          // no need to combine identical molecules
          molecules[this.moleculeID].combineWith(molecules[atom2.moleculeID]);
        }
      }
    }
  }

  delete() {
    while (this.bondIdList.length > 0) {
      let currentAtom = network[this.bondIdList[0]];
      currentAtom.removeBondWith(this);
    }
    molecules[this.moleculeID].removeAtom(this);
    this.deleted = true;
    this.clearData();
    return true;
  }

  updateNextBondAngleList() {
    // use bondType = 0 to get the nonlinear next bond angle
    let nonlinearNextBondAngle = this.calculateNextBondAngle(0);
    let currentBondAngles = this.getBondAngles();
    let linearNextBondAngle = (currentBondAngles[0]+180)%360
    // then check for special cases. repeated logic
    if (this.bondTypeList.includes(3)) {
      // make linear triple bonds: need 3+x bonds
      this.predictedNextBondAngleList[1] = linearNextBondAngle;
      this.predictedNextBondAngleList[0] = linearNextBondAngle;
    } else if (bondType === 2 && this.bondTypeList.includes(2)) {
      // make linear allene: need 2+2 bonds
      this.predictedNextBondAngleList[1] = linearNextBondAngle;
      this.predictedNextBondAngleList[0] = nonlinearNextBondAngle;
    } else {
      this.predictedNextBondAngleList[1] = nonlinearNextBondAngle;
      this.predictedNextBondAngleList[0] = nonlinearNextBondAngle;
    }
    // also linear triple bonds: need x+3 bonds
    this.predictedNextBondAngleList[2] = linearNextBondAngle;
    return true;
  }

  /**
   * Returns the calculated next bond angle, with Number optionalPriority being used to simulate the effect of more/less total connections and optionalExcludeAtomsList including atoms to exclude.
   * Use bondType = 0 to get the next bond angle without any effects of linear bonds, etc.
   * @param {Number} bondType 
   * @param {Number} optionalPriority 
   * @param {Array<Atom>} optionalExcludeAtomsList 
   * @returns {Number}
   */
  // TODO: this is really poorly written. but it works at least.
  // optionalPriority is the number of preexisting bonds that this function will pretend that the atom has
  calculateNextBondAngle(bondType, optionalPriority = this.bondIdList.length, optionalExcludeAtomsList = []) {
    // if I could just use pointers, I wouldn't have to deal with arrays being mutable when I want it to be immutable...
    let bondIdList = [...this.bondIdList];
    let bondTypeList = [...this.bondTypeList];
    for (let currentAtom of optionalExcludeAtomsList) {
      let index = bondIdList.indexOf(currentAtom.id);
      bondIdList.splice(index,1);
      bondTypeList.splice(index,1);
    }
    let currentBondAngles = this.getBondAngles(bondIdList);
    // check for special cases first
    if (bondType === 3 || bondTypeList.includes(3)) {
      // make linear triple bonds: need 3+x or x+3 bonds
      return (currentBondAngles[0]+180)%360;
    } else if (bondType === 2 && bondTypeList.includes(2)) {
      // make linear allene: need 2+2 bonds
      return (currentBondAngles[0]+180)%360;
    }

    let currentBondSectors = []; // ranges from 0 to 11 for each 30 degree sector, starting at -15 degrees
    if (this.numBonds !== 0) {
      for (let i = 0; i < bondIdList.length; i++) {
        currentBondSectors.push(Math.floor((this.findBondAngleWith(network[bondIdList[i]])+15)/30));
      }
    }
    if (optionalPriority > bondIdList.length) {
      // if optionalPriority is more than the actual number of bonded atoms to the atom, do the default case from the switch statement
      let ans = optionalPriority;
      while (currentBondSectors.includes(ans) && ans < 12) {
        ans++;
      }
      ans *= 30;
      return ans;
    }
    switch (optionalPriority) {
      case 0:
        return 330;
      case 1:
        // return which of the two possible bond angles 120 degrees away from the current bond angle is flatter (closer to 0 or 180 degrees)
        let answer = (currentBondSectors[0]*30+120)%360
        let alternate = (currentBondSectors[0]*30+240)%360
        if (Math.min(alternate%180,180-(alternate%180)) < Math.min(answer%180,180-(answer%180))) {
          answer = alternate;
        }
        return answer;
      case 2:
        // return the bond angle such that the new bond is in between the two prexisting bonds + 180 degrees (so on the other side)
        if (Math.abs(currentBondAngles[0] - currentBondAngles[1]) > 180) {
          return (Math.floor((currentBondAngles[0]+currentBondAngles[1])/2))%360;
        } else {
          return (Math.floor((currentBondAngles[0]+currentBondAngles[1])/2)+180)%360;
        }
      case 3:
        // return 240 degrees if it won't make the atom crowded, if not return 60 degrees if it won't make the atom crowded, if not just go around the sectors until one is free
        if (!currentBondSectors.includes(8) && !currentBondSectors.includes(9)) {
          return 240;
        } else if (!currentBondSectors.includes(2)) {
          return 60;
        } else {
          for (let i = 0; i < 12; i++) {
            if (!currentBondSectors.includes(i)) {
              return i*30;
            }
          }
        }
        return -1;
      default:
        // cycle around the sectors until one is empty or you reach 330 degrees. assumes optionalPriority > 3
        let ans = optionalPriority;
        while (currentBondSectors.includes(ans) && ans < 12) {
          ans++;
        }
        ans *= 30;
        return ans;
    }
  }

  removeBondWith(node2) {
    if (!this.bondIdList.includes(node2.id)) {
      return false;
    }
    let currentIndex = this.bondIdList.indexOf(node2.id);
    if (currentIndex !== -1) {
      molecules[this.moleculeID].removeBondBetween(this, node2);
      let bonds = this.bondTypeList[currentIndex];
      this.bondIdList.splice(currentIndex, 1);
      this.bondTypeList.splice(currentIndex, 1);
      let adjacentIndex = node2.bondIdList.indexOf(this.id);
      node2.bondIdList.splice(adjacentIndex, 1);
      node2.bondTypeList.splice(adjacentIndex, 1);
      this.changeNumBonds(-bonds);
      this.updateNextBondAngleList();
      node2.changeNumBonds(-bonds);
      node2.updateNextBondAngleList();
      return true;
    } else {
      return false;
    }
  }

  changeMoleculeNumber(moleculeNumber) {
    molecules[this.moleculeID].changeMoleculeNumber(moleculeNumber);
  }

  isMoreSubstitutedThan(node) {
    return this.bondIdList.length > node.bondIdList.length;
  }

  isMoreStableCarbocationThan(node) {
    // TODO: finish isMoreStableCarbocationThan function: what if it is unknown?
    return this.carbocationStabilityIndex() > node.carbocationStabilityIndex();
  }

  carbocationStabilityIndex() {
    return this.carbocationStabilityIndexHelper(0);
  }

  carbocationStabilityIndexHelper(index) {
    // TODO: this is a really inefficient algorithm and this is a bad way to handle other carbocations and can get stuck on aromatic rings
    if (this.name != "C") {
      return 0;
    }
    let ans = 0;
    if (index === 0) {
      // if this is the first atom, find the number of bonded atoms, then add anything due to resonance
      ans += this.bondIdList.length;
      for (let i = 0; i < this.bondIdList.length; i++) {
        ans += network[this.bondIdList[i]].carbocationStabilityIndexHelper(index+1);
      }
    } else {
      for (let i = 0; i < this.bondIdList.length; i++) {
        if (this.isBenzene()) {
          // add 4 for the super stable benzene if it's next to the original, otherwise decrease it by half every atom it's away. probably not accurate
          ans+=4/(2**index-1);
        } else if (this.bondTypeList[i] === index % 2 + 1) {
          // bad way to try to account for resonance. add 1/2+1/4+1/8+... for each resonance contributor. probably does not count all resonance
          ans += 1/(2**index);
          ans += network[this.bondIdList[i]].carbocationStabilityIndexHelper(index+1);
        }
      }
    }
    return ans;
  }

  getBondAngles(optionalIdList = this.bondIdList) {
    let ans = [];
    for (let i = 0; i < optionalIdList.length; i++) {
      ans.push(Math.round(this.findBondAngleWith(network[optionalIdList[i]])));
    }
    return ans;
  }
  

  /**
   * Returns the bond angle from Node this to Node atom2
   * @param {Node} atom2 
   * @returns {Number}
   */
  findBondAngleWith(node2) {
    return findBondAngle(this.x, this.y, node2.x, node2.y);
  }

  distanceToBondOf(node1, node2) {
    return distanceToBond(this.x, this.y, node1.x, node1.y, node2.x, node2.y);
  }

  sideOfBondOf(node1, node2) {
    return sideOfBond(this.x, this.y, node1.x, node1.y, node2.x, node2.y);
  }

  /**
   * Updates the functional group recursively based on the bonds between two atoms and the bondType between them
   * @param {Node} node
   * @param {Number} bondType 
   * @returns
   */
  updateFunctionalGroup(node, bondType) {
    // gives new names to atom and this based on which one has the lower element index (done to avoid having repeated code depending on which orentation the bond is)
    let atom1;
    let atom2;
    if (POSSIBLE_ELEMENTS.indexOf(node.name) > POSSIBLE_ELEMENTS.indexOf(this.name)) {
      atom2 = node;
      atom1 = this;
    } else {
      atom1 = node;
      atom2 = this;
    }
    // discriminates which possible functional groups have possibly been created first based on bondType, then based on atom1.name, then based on atom2.name (wow, a three dimensional switch statement!)
    switch (bondType) {
      case 1:
        // possible bonds in functional groups: C-N, C-O, C-N, C-S, O-O, O-N, N-N
        switch (atom1.name) {
          case "C":
            switch (atom2.name) {
              case "N":
                //
                this.functionalGroup = this.updateFunctionalGroup
                return;
              case "O":
                //
                return;
              case "S":
                //
                return;
              default:
                return;
            }
        }
        return;
      case 2:
        //
        return;
      case 3:
        //
        return;
      default:
        throw new Error("passed an invalid bondType to updateFunctionalGroup")
    }
  }

  changeNumBonds(changeNumBonds) {
    // changes numBonds such that this.numH + this.numBonds - this.charge = valenceOf(this.name), minimizing charge if possible
    // first convert between hydrogen bonds and regular bonds if possible 
    this.numBonds += changeNumBonds;
    this.numH -= changeNumBonds;
    if (this.numH < 0) {
      // if there aren't enough hydrogens to change into regular bonds, change the charge and number of unbonded electrons to cover the difference and maintain the octet
      this.charge -= this.numH;
      this.numLoneE += 2 * this.numH;
      this.numH = 0;
      if (this.numLoneE < 0) {
        // if doing this uses too many unbonded electrons, violate the octet
        this.charge += this.numLoneE;
        this.numLoneE = 0;
      }
    } else if (this.numH > 0 && this.charge > 0) {
      // if there is a positive charge and hydrogens that can be sacrified, break the bond to the hydrogen
      if (this.numH > this.charge) {
        this.numH -= this.charge;
        this.charge = 0;
      } else {
        this.charge -= this.numH;
        this.numH = 0;
      }
    }
  }
  
  updateNumBonds() {
    // resets the molecule to a lone atom and then adds in the bonds into the calculation
    this.numBonds = 0;
    for (let i = 0; i < this.bondTypeList.length; i++) {
      this.numBonds += this.bondTypeList[i];
    }
    this.charge = 0;
    this.numH = valenceOf(this.name) - this.numBonds;
    this.numLoneE = valenceElectronsOf(this.name) - valenceOf(this.name);
    // below is copy and pasted from changeNumBonds without changing this.numBonds
    if (this.numH < 0) {
      // if there aren't enough hydrogens to change into regular bonds, change the charge and number of unbonded electrons to cover the difference and maintain the octet
      this.charge -= this.numH;
      this.numLoneE += 2 * this.numH;
      this.numH = 0;
      if (this.numLoneE < 0) {
        // if doing this uses too many unbonded electrons, violate the octet
        this.charge += this.numLoneE;
        this.numLoneE = 0;
      }
    } else if (this.numH > 0 && this.charge > 0) {
      // if there is a positive charge and hydrogens that can be sacrified, break the bond to the hydrogen
      if (this.numH > this.charge) {
        this.numH -= this.charge;
        this.charge = 0;
      } else {
        this.charge -= this.numH;
        this.numH = 0;
      }
    }
    return true;
  }

  isHydroxyl() {
    return this.name === "O" && this.numBonds === 1 && network[this.bondIdList[0]].name === "C" && this.charge === 0 && this.numH === 1 && this.numLoneE === 4;
  }

  isProtectedHydroxyl() {
    return this.name === "OTBS" && this.numBonds === 1 && network[this.bondIdList[0]].name === "C" && this.charge === 0 && this.numH === 0 && this.numLoneE === 0;
  }

  isKetone() { // is ketone or aldehyde
    return this.name === "O" && this.numBonds === 2 && this.bondIdList.length == 1 && network[this.bondIdList[0]].name === "C" && this.charge === 0 && this.numH === 0 && this.numLoneE === 4;
  }

  isLeavingGroup() {
    return (this.name === "Br" || this.name === "Cl" || this.name === "F" || this.name === "I" || this.name === "Ts") && this.numBonds === 1 && this.bondIdList.length == 1 && network[this.bondIdList[0]].name === "C" && this.charge === 0 && this.numH === 0 && this.numLoneE === 6;
  }

  isHydrogenHalide() {
    return (this.name === "Br" || this.name === "Cl" || this.name === "F" || this.name === "I") && this.numBonds === 0 && this.bondIdList.length == 0 && this.numH === 1 && this.charge === 0 && this.numLoneE === 6;
  }

  isHalide() {
    return (this.name === "Br" || this.name === "Cl" || this.name === "F" || this.name === "I") && this.numBonds === 1 && this.bondIdList.length == 1 && network[this.bondIdList[0]].name === "C" && this.charge === 0 && this.numH === 0 && this.numLoneE === 6;
  }

  isLithiate() {
    return this.name === "Li" && this.numBonds === 1 && this.bondIdList.length == 1 && network[this.bondIdList[0]].name === "C" && this.charge === 0 && this.numH === 0 && this.numLoneE === 0;
  }

  isBenzene() {
    return this.isBenzeneHelper(0, this.id);
  }
  
  // cycle through each bond one by one and see if there is a chain of 6 carbon atoms of single,double,single,double,single,double bonds (no need to check the other pattern since it's the same)
  isBenzeneHelper(index, finalID) {
    if (index === 6) {
      if (this.id === finalID) { // see if, after 6 carbons, the chain cycles back to the original
        return true;
      } else {
        return false;
      }
    } else if (this.name != "C") { // see if this atom is a carbon
      return false;
    } else {
      // recursively run the helper function on atoms bonded with the next single/double bond
      let ans = false;
      for (let i = 0; i < this.bondTypeList.length; i++) {
        if (this.bondTypeList[i] === index % 2 + 1) {
          ans = ans || network[this.bondIdList[i]].isBenzeneHelper(index+1, finalID);
        }
      }
      return ans;
    }
  }
}

// define the Atom class, which is to be used for atoms
// TODO: possible performance improvements by caching functional groups, though too small to worry about right now
class Atom extends Node {
  constructor(id,name,x,y,numBonds,charge,numH,numLoneE,deleted,predictedNextBondAngleList,bondIdList,bondTypeList,moleculeID,functionalGroupList) {
    super(id,name,x,y,numBonds,charge,numH,numLoneE,deleted,predictedNextBondAngleList,bondIdList,bondTypeList,moleculeID);
    this.functionalGroupList = functionalGroupList; // I don't anticipate that it will be possible for an atom to be in multiple functional groups that will be good for our uses, but make it a list anyways
  }

  clearData() {
    super.clearData();
    this.functionalGroupList = null;
  }
}

class FunctionalGroup extends Node {
  constructor(id,name,x,y,deleted,numBonds,predictedNextBondAngleList,bondIdList,bondTypeList,moleculeID,containedAtomList) {
    super(id,name,x,y,deleted,numBonds,predictedNextBondAngleList,bondIdList,bondTypeList,moleculeID);
    this.containedAtomList = containedAtomList;
  }

  clearData() {
    super.clearData();
    this.containedAtomList = null;
  }
}

class Molecule {
  constructor(id,x1,y1,x2,y2,deleted,atomIDs) {
    this.id = id;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.deleted = deleted;
    this.atomIDs = atomIDs;
    this.length = -1; // because length doesn't make sense for a molecule
  }

  delete() {
    for (let i = 0; i < this.atomIDs.length; i++) {
      let currentAtom = network[this.atomIDs[i]];
      currentAtom.deleted = true;
      currentAtom.clearData();
    }
    this.deleted = true;
    this.clearData();
    return true;
  }

  addNewAtom(atom) {
    if (this.deleted) {
      throw new Error("referenced deleted molecule");
    }
    this.atomIDs.push(atom.id);
    if (atom.x < this.x1) {
      this.x1 = atom.x;
    }
    if (atom.y < this.y1) {
      this.y1 = atom.y;
    }
    if (atom.x > this.x2) {
      this.x2 = atom.x;
    }
    if (atom.y > this.y2) {
      this.y2 = atom.y;
    }
    atom.moleculeID = this.id;
  }

  recalculateBounds() {
    if (this.deleted) {
      throw new Error("referenced deleted molecule");
    }
    if (this.atomIDs.length === 0) {
      throw new Error("tried to recalculate x1 of empty molecule")
    }
    let x1 = network[this.atomIDs[0]].x;
    let y1 = network[this.atomIDs[0]].y;
    let x2 = network[this.atomIDs[0]].x;
    let y2 = network[this.atomIDs[0]].y;
    for (let i = 0; i < this.atomIDs.length; i++) {
      let currentAtom = network[this.atomIDs[i]];
      if (currentAtom.x < x1) {
        x1 = currentAtom.x;
      }
      if (currentAtom.y < y1) {
        y1 = currentAtom.y;
      }
      if (currentAtom.x > x2) {
        x2 = currentAtom.x;
      }
      if (currentAtom.y > y2) {
        y2 = currentAtom.y;
      }
    }
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  moveBounds(changeX,changeY) {
    this.x1 += changeX;
    this.y1 += changeY;
    this.x2 += changeX;
    this.y2 += changeY;
  }

  removeAtom(atom) {
    // removes the atom's branches from itself, then deletes itself
    if (this.deleted) {
      throw new Error("referenced deleted molecule");
    }
    if (atom.deleted) {
      throw new Error("referenced deleted atom - delete atom AFTER molecule.remove(atom)");
    }
    if (!this.atomIDs.includes(atom.id)) {
      return false;
    }
    this.atomIDs.splice(this.atomIDs.indexOf(atom.id), 1);
    for (let i = 0; i < atom.bondIdList.length; i++) {
      this.removeBondBetween(atom, network[atom.bondIdList[i]]);
    }
    this.delete();
  }

  clearData() {
    if (!this.deleted) {
      throw new Error("tried to clear data of nondeleted molecule");
    }
    this.id = null;
    this.x1 = null;
    this.y1 = null;
    this.x2 = null;
    this.y2 = null;
    this.atomIDs = null;
  }

  combineWith(molecule) {
    if (this.deleted) {
      throw new Error("referenced deleted molecule");
    }
    if (this.id === molecule.id) {
      throw new Error("tried to combine molecule with itself");
    }
    if (molecule.x1 < this.x1) {
      this.x1 = molecule.x1;
    }
    if (molecule.y1 < this.y1) {
      this.y1 = molecule.y1;
    }
    if (molecule.x2 > this.x2) {
      this.x2 = molecule.x2;
    }
    if (molecule.y2 > this.y2) {
      this.y2 = molecule.y2;
    }
    for (let i = 0; i < molecule.atomIDs.length; i++) {
      let currentAtomId = molecule.atomIDs[i];
      this.atomIDs.push(currentAtomId);
      network[currentAtomId].moleculeID = this.id;
    }
    molecule.deleted = true;
  }

  removeBondBetween(atom1, atom2) {
    if (this.deleted) {
      throw new Error("removeBondBetween referenced deleted molecule");
    }
    if (atom1.deleted || atom2.deleted) {
      throw new Error("removeBondBetween referenced deleted atoms");
    }
    if (!this.atomIDs.includes(atom1.id) || !this.atomIDs.includes(atom2.id)) {
      return false;
    }
    if (!atom1.bondIdList.includes(atom2.id)) {
      throw new Error("molecule.removeBondBetween must be called on two atoms that currently have a bond");
    }
    if (this.isBridge(atom1, atom2)) {
      molecules.push(new Molecule(nextMoleculeID, atom2.x, atom2.y, atom2.x, atom2.y, false, []))
      let seenNetwork = {};
      seenNetwork[atom1.id] = true;
      this.removeBondBetweenHelper(atom2, seenNetwork, nextMoleculeID);
      nextMoleculeID++;
      this.recalculateBounds();
    }
    return true;
  }

  removeBondBetweenHelper(atom, seenNetwork, moleculeID) {
    seenNetwork[atom.id] = true;
    atom.moleculeID = moleculeID;
    molecules[nextMoleculeID].addNewAtom(atom);
    this.atomIDs.splice(this.atomIDs.indexOf(atom.id), 1);
    for (let i = 0; i < atom.bondIdList.length; i++) {
      let currentAtom = network[atom.bondIdList[i]];
      if (!seenNetwork[currentAtom.id]) {
        this.removeBondBetweenHelper(currentAtom, seenNetwork, moleculeID);
      }
    }
  }

  isBridge(atom1, atom2) {
    if (this.deleted) {
      throw new Error("isBridge referenced deleted molecule");
    }
    if (atom1.deleted || atom2.deleted) {
      throw new Error("isBridge referenced deleted atoms");
    }
    if (!this.atomIDs.includes(atom1.id) || !this.atomIDs.includes(atom2.id)) {
      return false;
    }
    let seenAtomIDS = new Set();
    seenAtomIDS.add(atom1.id);
    let ans = true;
    for (let i = 0; i < atom1.bondIdList.length; i++) {
      let currentAtom = network[atom1.bondIdList[i]];
      if (currentAtom.id === atom2.id || seenAtomIDS.has(atom2.id)) {
        // skip the bond between atom1 and atom2 if it exists without checking again in the recursi ve function
        continue;
      } else {
        // isBridgeHelper returns false if it IS a bridge
        ans = ans && !this.isBridgeHelper(currentAtom, atom2, seenAtomIDS);
      }
    }
    return ans;
  }

  isBridgeHelper(currentAtom, targetAtom, seenAtomIDS) {
    seenAtomIDS.add(currentAtom.id);
    let ans = false;
    for (let i = 0; i < currentAtom.bondIdList.length; i++) {
      let currentAtom2 = network[currentAtom.bondIdList[i]];
      if (targetAtom.id === currentAtom2.id) {
        return true;
      } else if (!seenAtomIDS.has(currentAtom2.id)) {
        ans = ans || this.isBridgeHelper(currentAtom2, targetAtom, seenAtomIDS);
      }
    }
    return ans;
  }

/**
 * Sees if Node atom1 is a bigger branch than Node atom2. Returns 0 if Node atom1 is bigger, 1 if Node atom2 is bigger, 2 if they are the same size, and -1 if atom1 and atom2 is not a bridge
 * @param {Node} atom1 
 * @param {Node} atom2 
 * @returns {Number}
 */
 compareBranchSize(atom1, atom2) {
    if (this.deleted) {
      throw new Error("biggerBranch referenced deleted molecule");
    }
    if (atom1.deleted || atom2.deleted) {
      throw new Error("biggerBranch referenced deleted atoms");
    }
    if (!this.atomIDs.includes(atom1.id) || !this.atomIDs.includes(atom2.id)) {
      throw new Error("biggerBranch referenced atoms not in the molecule");
    }
    if (!this.isBridge(atom1, atom2)) {
      return -1;
    } else {
      switch (Math.sign(this.branchSize(atom1, atom2) - this.branchSize(atom2, atom1))) {
        case 1:
          return 0;
        case 0:
          return 2;
        case -1:
          return 1;
      }
    }
  }

  /**
   * Returns the size of the branch attached to Node atom1, ignoring Node atom2. Returns -1 if the bond between atom1 and atom2 is a bridge
   * @param {Node} atom1 
   * @param {Node} atom2 
   * @returns {Number}
   */
  branchSize(atom1, atom2) {
    if (this.deleted) {
      throw new Error("firstNodeIsBiggerBranch referenced deleted molecule");
    }
    if (atom1.deleted || atom2.deleted) {
      throw new Error("firstNodeIsBiggerBranch referenced deleted atoms");
    }
    if (!this.atomIDs.includes(atom1.id) || !this.atomIDs.includes(atom2.id)) {
      throw new Error("firstNodeIsBiggerBranch referenced atoms not in the molecule");
    }
    // TODO: incorporate isBridge logic into the recursive function
    if (!this.isBridge(atom1, atom2)) {
      return -1;
    }
    let seenAtomIDS = new Set();
    seenAtomIDS.add(atom1.id);
    let ans = 0;
    ans++;
    let isBridge = true;
    // this initial for loop is done to skip the bond between atom1 and atom2 while not needing to check it every time in the recursion loop
    for (let i = 0; i < atom1.bondIdList.length; i++) {
      let currentAtom = network[atom1.bondIdList[i]];
      if (currentAtom.id === atom2.id || seenAtomIDS.has(currentAtom.id)) {
        continue;
      } else {
        ans += this.branchSizeHelper(currentAtom, atom1, atom2, seenAtomIDS, ans, isBridge);
      }
    }
    return ans;
  }

  branchSizeHelper(currentAtom, startAtom, endAtom, seenAtomIDS, currentAns, isBridge) {
    seenAtomIDS.add(currentAtom.id);
    let ans = 1;
    for (let i = 0; i < currentAtom.bondIdList.length; i++) {
      if (currentAns !== -1) {
        let currentAtom2 = network[currentAtom.bondIdList[i]];
        if (!seenAtomIDS.has(currentAtom2.id)) {
          ans += this.branchSizeHelper(currentAtom2, startAtom, endAtom, seenAtomIDS, currentAns, isBridge);
        }
      } else {
        // to exit out of the recursion
        currentAns = -1;
        break;
      }
    }
    return ans;
  }

  /**
   * Calculates the set of all Nodes in the branch from Node atom1 that does not include Node atom2 but does include Node atom1. Returns an empty set if atom1 and atom2 is not a bridge
   * @param {Node} atom1 
   * @param {Node} atom2 
   * @returns {Set}
   */
  calculateBranch(atom1, atom2) {
    if (this.deleted) {
      throw new Error("calculateBranch referenced deleted molecule");
    }
    if (atom1.deleted || atom2.deleted) {
      throw new Error("calculateBranch referenced deleted atoms");
    }
    if (!this.atomIDs.includes(atom1.id) || !this.atomIDs.includes(atom2.id)) {
      throw new Error("calculateBranch referenced atoms not in the molecule");
    }
    // TODO: incorporate isBridge logic into the recursive function
    if (!this.isBridge(atom1, atom2)) {
      return new Set();
    }
    let seenAtomIDS = new Set();
    seenAtomIDS.add(atom1.id);
    let ans = new Set();
    ans.add(atom1);
    let isBridge = true;
    // this initial for loop is done to skip the bond between atom1 and atom2 while not needing to check it every time in the recursion loop
    for (let i = 0; i < atom1.bondIdList.length; i++) {
      let currentAtom = network[atom1.bondIdList[i]];
      if (currentAtom.id === atom2.id || seenAtomIDS.has(currentAtom.id)) {
        continue;
      } else {
        this.calculateBranchHelper(currentAtom, atom1, atom2, seenAtomIDS, ans, isBridge);
      }
    }
    return ans;
  }

  calculateBranchHelper(currentAtom, startAtom, endAtom, seenAtomIDS, currentAns, isBridge) {
    seenAtomIDS.add(currentAtom.id);
    currentAns.add(currentAtom);
    for (let i = 0; i < currentAtom.bondIdList.length; i++) {
      if (isBridge) {
        let currentAtom2 = network[currentAtom.bondIdList[i]];
        if (!seenAtomIDS.has(currentAtom2.id)) {
          this.calculateBranchHelper(currentAtom2, startAtom, endAtom, seenAtomIDS, currentAns, isBridge);
        }
      } else {
        // to exit out of the recursion
        currentAns = [];
        break;
      }
    }
  }
}

// preload Arial font
let font;
function preload() {
  font = loadFont("./arial.ttf");
}

// set up canvases
function setup() {
  // createCanvas must be the first statement
  // middleground: preexisting bonds and atoms
  windowWidth = Math.max(window.innerWidth-20,MIN_WIDTH);
  windowHeight = Math.max(window.innerHeight-20,MIN_HEIGHT);
  createCanvas(windowWidth,windowHeight);
  textFont(font);
  middleground = createGraphics(windowWidth,windowHeight);
  foreground = createGraphics(windowWidth,windowHeight);
  middleground.stroke(0); // Set line drawing color to black
  middleground.textSize(20);
  middleground.textAlign(CENTER, CENTER);
  foreground.textSize(20);
  foreground.textAlign(CENTER, CENTER);
  frameRate(60);
  pixelDensity(1);
  tip = "Tip: "+ tips[Math.floor(Math.random()*tips.length)];
  retrieveSettings();
  console.log("Written by Joseph. github.com/OneRandomGithubUser");
}

function draw() {
  try {
    // parseInt so that cachedMouseX and cachedMouseY don't keep changing during rending, i think
    let cachedMouseX = parseInt(mouseX);
    let cachedMouseY = parseInt(mouseY);
    if (hackerman && frameCount%3 === 0) {
      // this is a joke feature. continually clears the frame and then makes 10 random molecules
      clickButton(11);
      clickButton(12);
      clickButton(12);
      clickButton(12);
      clickButton(12);
      clickButton(12);
      clickButton(12);
      clickButton(12);
      clickButton(12);
      clickButton(12);
      clickButton(12);
    }

    if (somethingClicked) {
      if (buttonClicked) {
        buttonClicked = false;
      } else {
        selectBox(0);
      }
      clickButton(selectedBox);
      somethingClicked = false;
    }

    if (renderFrame) {
      // clear the frame only if it is not in the intro or frameCount >= 60 (the !intro is there to prevent checking frameCount every time)
      if (!intro || frameCount >= INTRO_FADE_START_FRAME) {
        foreground.clear();
      }

      if (!mousePressed) {
        selectedAtom = [];
        selectedBond = [];
        selectedMolecule = [];
      }

      closestDistance = SELECTION_DISTANCE;
      let closestBondDistance = SELECTION_DISTANCE;
      let bondAngle;

      // calculate closest selected atom/bond as long as the mouse is not being dragged
      // TODO: this algorithm can be made much more efficient
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        // don't even consider deleted atoms
        if (currentAtom.deleted) {
          continue;
        }
        if (!mousePressed) {
          // find closest atom
          let distance = Math.sqrt((cachedMouseX-currentAtom.x)**2 + (cachedMouseY-currentAtom.y)**2);
          if (distance < closestDistance) {
            closestDistance = distance;
            selectedAtom = currentAtom;
          }
          if (selectedAtom.length === 0 && selectedTool !== "atom" && selectedTool !== "chargeH") {
            // find closest bond if there is no closest atom when the selectedTool is bond or drag
            for (let j = 0; j < currentAtom.bondIdList.length; j++) {
              let currentAtom2 = network[currentAtom.bondIdList[j]];
              if (!currentAtom2.deleted) {
                let distance = distanceToBond(cachedMouseX, cachedMouseY, currentAtom.x, currentAtom.y, currentAtom2.x, currentAtom2.y);
                if (distance < closestBondDistance) {
                  closestBondDistance = distance;
                  selectedBond = [currentAtom, currentAtom2, currentAtom.bondTypeList[j]];
                }
              }
            }
          }
        }
      }

      if (selectedTool === "moleculeDrag" || selectedTool === "moleculeDelete") {
        if (selectedBond.length !== 0) {
          selectedMolecule = molecules[selectedBond[0].moleculeID];
          // should not need to consider selectedBond[1] since they should be in the same molecule
        } else if (selectedAtom.length !== 0) {
          selectedMolecule = molecules[selectedAtom.moleculeID];
        }
      }

      // calculate new bond angle
      if (selectedAtom.length !== 0 && !mousePressed && selectedTool === "bond") {
        validAction = true;
        // when there is a selectedAtom and the mouse is not being dragged and the bond tool is selected
        if (selectedAtom.numBonds > maxBonds(selectedAtom.name)-bondType) {
          // too many bonds
          validAction = false;
        } else {
          bondAngle = selectedAtom.predictedNextBondAngleList[bondType-1];
        }
        previewX1 = selectedAtom.x;
        previewY1 = selectedAtom.y;
        previewX2 = selectedAtom.x + Math.cos(toRadians(360-bondAngle))*BOND_LENGTH;
        previewY2 = selectedAtom.y + Math.sin(toRadians(360-bondAngle))*BOND_LENGTH;
      } else if (selectedAtom.length !== 0 && !mousePressed) {
        validAction = true;
        // when only one point is selected, not two, when selectedTool is atom or drag or delete or chargeH
        previewX1 = selectedAtom.x;
        previewY1 = selectedAtom.y;
        if (selectedTool === "atom") {
          if (selectedAtom.numBonds > maxBonds(element)) {
            validAction = false;
          } else {
            bondAngle = 330;
          }
        } else if (selectedTool !== "chargeH") {
          // selectedTool is drag or delete
          validAction = true;
        } else if (selectedTool === "chargeH") {
          // avoid causing a negative numH
          if (element === "-H" && selectedAtom.numH <= 0 || element === "+H" && selectedAtom.numBonds + selectedAtom.numH >= valenceElectronsOf(selectedAtom.name)) {
            validAction = false;
          } else if (element === "+2𝑒" && selectedAtom.numH + selectedAtom.numBonds - selectedAtom.charge >= valenceOf(selectedAtom.name) - 1 || element === "-2𝑒" && selectedAtom.numLoneE <= 1) {
            // the number of unbonded electrons is valenceElectronsOf(selectedAtom.name) - (selectedAtom.numH + selectedAtom.numBonds) - selectedAtom.charge, as per the definition of formal charge
            // the maximum number of unbonded electrons (full octet) is when selectedAtom.numH + selectedAtom.numBonds - selectedAtom.charge = valenceOf(selectedAtom.name)
            validAction = false;
          }
        }
      } else if (mousePressed) {
        // on mouse drag, stop updating previewX1 and previewY1 when selectedTool is bond
        if (selectedTool === "bond") {
          if (angleSnap) {
            if (selectedAtom.numBonds > maxBonds(selectedAtom.name)-bondType) {
              // too many bonds
              validAction = false;
            } else {
              bondAngle = Math.floor((findBondAngle(previewX1,previewY1,cachedMouseX,cachedMouseY)+15)/30)*30;
              validAction = true;
              // round bond angle to nearest 30 degrees
            }
            previewX2 = previewX1 + Math.cos(toRadians(360-bondAngle))*BOND_LENGTH;
            previewY2 = previewY1 + Math.sin(toRadians(360-bondAngle))*BOND_LENGTH;
          } else {
            previewX2 = cachedMouseX;
            previewY2 = cachedMouseY;
            if (selectedAtom.numBonds > maxBonds(selectedAtom.name)-bondType) {
              // too many bonds
              validAction = false;
            } else {
              bondAngle = findBondAngle(previewX1,previewY1,cachedMouseX,cachedMouseY);
              validAction = true;
            }
          }
        } else if (selectedTool === "atomDrag" || selectedTool === "moleculeDrag") {
          validAction = true;
          // when mouse is dragged, edit the position of the selectedAtom or selectedBond
          let diffX = cachedMouseX - previousMouseX;
          let diffY = cachedMouseY - previousMouseY;
          let trackedDistance = SELECTION_DISTANCE;
          let selectedAtoms = [];
          if (selectedTool === "atomDrag") {
            if (selectedBond.length !== 0) {
              selectedBond[0].x += diffX;
              selectedBond[0].y += diffY;
              selectedBond[1].x += diffX;
              selectedBond[1].y += diffY;
              // TODO: update this recalcualeBounds to only do it if it's necessary
              molecules[selectedBond[0].moleculeID].recalculateBounds();
            } else if (selectedAtom.length !== 0) {
              previewX1 = cachedMouseX;
              previewY1 = cachedMouseY;
              // snap the atom to an existing atom if possible
              if (angleSnap) {
                for (let i = 0; i < selectedAtom.bondIdList.length; i++) {
                  let currentAtom = network[selectedAtom.bondIdList[i]];
                  let distance = pointDistance(currentAtom.x, currentAtom.y, cachedMouseX, cachedMouseY);
                  if (distance < BOND_LENGTH + SELECTION_DISTANCE && distance > BOND_LENGTH - SELECTION_DISTANCE) { // initial check before doing intensive calculations
                    for (let i = 0; i < 12; i++) {
                      let offsetedX = currentAtom.x - BOND_LENGTH * Math.cos(toRadians(30*i));
                      let offsetedY = currentAtom.y + BOND_LENGTH * Math.sin(toRadians(30*i));
                      let currentDistance = pointDistance(offsetedX, offsetedY, cachedMouseX, cachedMouseY);
                      if (currentDistance < SELECTION_DISTANCE && currentDistance < trackedDistance) {
                        let closestAtom = findClosestDestinationAtom(offsetedX, offsetedY, currentAtom, network, selectedAtom);
                        // closestAtom is null if the closestAtom already has a bond with currentAtom. Prevents being able to make two bonds in the same place
                        if (closestAtom !== null && closestAtom.length === 0) {
                          previewX1 = offsetedX;
                          previewY1 = offsetedY;
                          trackedDistance = currentDistance;
                        }
                      }
                    }
                  }
                }
              }
              selectedAtom.x = previewX1;
              selectedAtom.y = previewY1;
              molecules[selectedAtom.moleculeID].recalculateBounds();
            }
          } else {
            // selectedTool is moleculeDrag
            if (selectedMolecule.length !== 0){
              selectedMolecule.moveBounds(diffX, diffY);
              for (let i = 0; i < selectedMolecule.atomIDs.length; i++) {
                let currentAtom = network[selectedMolecule.atomIDs[i]];
                currentAtom.x += diffX;
                currentAtom.y += diffY;
              }
            }
          }
          previewX1 = cachedMouseX;
          previewX2 = cachedMouseY;
            // TODO: snap if the selectedAtom is now within an acceptable distance from one of its bonded atoms
        }
      } else {
        validAction = true;
        // no selectedAtom
        previewX1 = cachedMouseX;
        previewY1 = cachedMouseY;
        bondAngle = 330;
        previewX2 = cachedMouseX + Math.cos(toRadians(360-bondAngle))*BOND_LENGTH;
        previewY2 = cachedMouseY + Math.sin(toRadians(360-bondAngle))*BOND_LENGTH;
      }

      if (renderMiddleground) {
        middleground.background(255);
        middleground.noStroke();
        middleground.textSize(48);
        middleground.textAlign(RIGHT, BOTTOM);
        middleground.text("KyneDraw", windowWidth-20, windowHeight-20); // wordmark
        middleground.stroke(0);
        middleground.textSize(20);
        middleground.textAlign(CENTER, CENTER);
        // render bonds
        middleground.stroke(0);
        for (let i = 0; i < network.length; i++) {
          let currentAtom = network[i];
          if (currentAtom.deleted) {
            continue;
          }
          if (currentAtom.numBonds !== 0) {
            for (let j = 0; j < currentAtom.bondIdList.length; j++) {
              // only draw it if it's a bond from a lesser ID to a greater ID. prevents drawing the bond twice (since bonds don't go from atoms to themselves)
              if (currentAtom.bondIdList[j] > currentAtom.id) {
                let adjacentAtom = network[currentAtom.bondIdList[j]];
                if (!adjacentAtom.deleted) {
                  bond(currentAtom.x, currentAtom.y, adjacentAtom.x, adjacentAtom.y, currentAtom.bondTypeList[j], middleground);
                }
              }
            }
          }
        }
        // render atoms
        for (let i = 0; i < network.length; i++) {
          let currentAtom = network[i];
          if (currentAtom.deleted) {
            continue;
          }
          let label = "";
          if (currentAtom.name !== "C" || currentAtom.name === "C" && currentAtom.numBonds === 0) {
            if (currentAtom.numH > 1) {
              let subscript = ["₀","₁","₂","₃","₄","₅","₆","₇","₈","₉"];
              let tens = currentAtom.numH;
              while (tens !== 0) {
                label = subscript[tens%10] + label;
                tens = Math.floor(tens/10);
              }
            }
            if (currentAtom.numH > 0) {
              label = "H" + label;
            }
          }
          if ((currentAtom.name === "O" || currentAtom.name === "S") && currentAtom.numH >= 2 || currentAtom.isHydrogenHalide()) {
            label += currentAtom.name;
          } else if (currentAtom.name !== "C" || currentAtom.name === "C" && currentAtom.numBonds === 0) {
            label = currentAtom.name + label;
          }
          if (Math.abs(currentAtom.charge) > 1) {
            let temp = "";
            let superscript = ["⁰","¹","²","³","⁴","⁵","⁶","⁷","⁸","⁹"];
            let tens = Math.abs(currentAtom.charge);
            while (tens !== 0) {
              temp = superscript[tens%10] + temp;
              tens = Math.floor(tens/10);
            }
            label += temp;
          }
          if (currentAtom.charge > 0) {
            label += "⁺";
          } else if (currentAtom.charge < 0) {
            label += "⁻";
          }
          if (label !== "") {
            middleground.noStroke();
            middleground.fill(255);
            let boundingBox = font.textBounds(label, currentAtom.x, currentAtom.y, 20, CENTER, CENTER);
            middleground.rect(boundingBox.x-5-boundingBox.w/2, boundingBox.y-5+boundingBox.h/2, boundingBox.w+10, boundingBox.h+10); // TODO: figure out why this is so weird, especially with H2O
            middleground.fill(0);
            middleground.text(label, currentAtom.x, currentAtom.y);
          }
        }
        renderMiddleground = false;
      }
      
      // render cyan/red selection dot
      if (selectedAtom.length !== 0 && selectedTool !== "moleculeDrag" && selectedTool !== "moleculeDelete") {
        if (!validAction || selectedTool === "atomDelete") {
          foreground.fill(255,0,0);
        } else {
          foreground.fill(48,227,255);
        }
        foreground.circle(selectedAtom.x,selectedAtom.y,10);
        foreground.fill(255);
      }

      // highlight selected bond when selectedTool is bond or atom drag
      if (selectedAtom.length === 0 && selectedBond.length !== 0 && (selectedTool === "bond" || selectedTool === "atomDrag" || selectedTool === "atomDelete")) {
        let color;
        if (selectedTool === "bond" && (selectedBond[0].numBonds - selectedBond[2] + bondType > maxBonds(selectedBond[0].name) || selectedBond[1].numBonds - selectedBond[2] + bondType > maxBonds(selectedBond[1].name)) || selectedTool === "atomDelete") {
          // highlight red to not change selected bond if it would cause too many bonds only when the selectedTool is bond, or when the selectedTool is atomDelete
          color = [255,0,0];
          highlightedBond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, selectedBond[2], color, foreground);
          if (selectedTool === "bond") {
            bond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, bondType, foreground);
            selectedBond = [];
          }
        } else {
          color = [48,227,255];
          highlightedBond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, selectedBond[2], color, foreground);
          if (selectedTool === "bond") {
            bond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, bondType, foreground);
          }
        }
        validAction = false;
      } else {
        selectedBond = [];
      }

      // highlight selected molecule when selectedTool is moleculeDrag or moleculeDelete
      if ((selectedTool === "moleculeDrag" || selectedTool === "moleculeDelete") && selectedMolecule.length !== 0) {
        foreground.strokeWeight(3);
        // DEBUG: foreground.noFill();
        // DEBUG: foreground.rect(selectedMolecule.x1, selectedMolecule.y1, selectedMolecule.x2-selectedMolecule.x1, selectedMolecule.y2-selectedMolecule.y1);
        if (selectedTool === "moleculeDrag") {
          foreground.stroke(48,227,255);
          foreground.fill(48,227,255);
        } else {
          foreground.stroke(255,0,0);
          foreground.fill(255,0,0);
        }
        for (let i = 0; i < selectedMolecule.atomIDs.length; i++) {
          let currentAtom = network[selectedMolecule.atomIDs[i]];
          // don't even consider deleted atoms
          if (currentAtom.deleted) {
            continue;
          }
          // render preexisting bonds
          if (currentAtom.numBonds !== 0) {
            for (let j = 0; j < currentAtom.bondIdList.length; j++) {
              // only draw it if it's a bond from a lesser ID to a greater ID. prevents drawing the bond twice (bonds don't go from atoms to themselves)
              if (currentAtom.bondIdList[j] > currentAtom.id) {
                let adjacentAtom = network[currentAtom.bondIdList[j]];
                if (!adjacentAtom.deleted) {
                  bond(currentAtom.x, currentAtom.y, adjacentAtom.x, adjacentAtom.y, currentAtom.bondTypeList[j], foreground);
                }
              }
            }
          }
          
          // render preexisting atoms
          if (currentAtom.deleted) {
            continue; // deleted atom
          } else {
            // account for the atom's charge, asumming it has hydrogens if it makes sense to assume so
            let label = "";
            if (currentAtom.name !== "C" || currentAtom.name === "C" && currentAtom.numBonds === 0) {
              if (currentAtom.numH > 1) {
                let subscript = ["₀","₁","₂","₃","₄","₅","₆","₇","₈","₉"];
                let tens = currentAtom.numH;
                while (tens !== 0) {
                  label = subscript[tens%10] + label;
                  tens = Math.floor(tens/10);
                }
              }
              if (currentAtom.numH > 0) {
                label = "H" + label;
              }
            }
            if ((currentAtom.name === "O" || currentAtom.name === "S") && currentAtom.numH >= 2 || currentAtom.isHydrogenHalide()) {
              label += currentAtom.name;
            } else if (currentAtom.name !== "C" || currentAtom.name === "C" && currentAtom.numBonds === 0) {
              label = currentAtom.name + label;
            }
            if (Math.abs(currentAtom.charge) > 1) {
              let temp = "";
              let superscript = ["⁰","¹","²","³","⁴","⁵","⁶","⁷","⁸","⁹"];
              let tens = Math.abs(currentAtom.charge);
              while (tens !== 0) {
                temp = superscript[tens%10] + temp;
                tens = Math.floor(tens/10);
              }
              label += temp;
            }
            if (currentAtom.charge > 0) {
              label += "⁺";
            } else if (currentAtom.charge < 0) {
              label += "⁻";
            }
            if (label !== "") {
              foreground.noStroke();
              foreground.fill(255);
              let boundingBox = font.textBounds(label, currentAtom.x, currentAtom.y, 20, CENTER, CENTER);
              foreground.rect(boundingBox.x-5-boundingBox.w/2, boundingBox.y-5+boundingBox.h/2, boundingBox.w+10, boundingBox.h+10); // TODO: figure out why this is so weird, especially with H2O
              if (selectedTool === "moleculeDrag") {
                foreground.fill(48,227,255);
                foreground.text(label, currentAtom.x, currentAtom.y);
                foreground.stroke(48,227,255);
              } else {
                foreground.fill(255,0,0);
                foreground.text(label, currentAtom.x, currentAtom.y);
                foreground.stroke(255,0,0);
              }
            }
          }
        }
        foreground.fill(0);
        foreground.strokeWeight(1);
        foreground.stroke(0);
      }
      if (selectedTool === "bond") {
        // calculate destination atom
        destinationAtom = findClosestDestinationAtom(previewX2,previewY2,selectedAtom,network);

        // render cyan/red destination dot
        if (destinationAtom === null) {
          // invalid destination atom
          foreground.fill(255,0,0);
          foreground.circle(previewX2,previewY2,10);
          foreground.fill(255);
          validAction = false;
        } else if (destinationAtom.length !== 0) {
          previewX2 = destinationAtom.x;
          previewY2 = destinationAtom.y;
          if (selectedAtom.length === 0) {
            // if selectedAtom does not exist, snap previewX1 and previewY1
            previewX1 = previewX2 - BOND_LENGTH * Math.cos(toRadians(bondAngle));
            previewY1 = previewY2 + BOND_LENGTH * Math.sin(toRadians(bondAngle));
          } else {
            bondAngle = findBondAngle(previewX1,previewY1,previewX2,previewY2);
          }
          if (destinationAtom.numBonds <= maxBonds(destinationAtom.name)-bondType && validAction) {
            foreground.fill(48,227,255);
            foreground.circle(destinationAtom.x,destinationAtom.y,10);
            foreground.fill(255);
          } else {
            // invalid destination atom
            foreground.fill(255,0,0);
            foreground.circle(destinationAtom.x,destinationAtom.y,10);
            foreground.fill(255);
            validAction = false;
          }
        }
      }

      // draw preview
      if (selectedTool === "atom" || selectedTool === "chargeH") {
        foreground.rectMode(CENTER);
        foreground.fill(0);
        foreground.noStroke();
        foreground.textSize(20);
        foreground.text(element, previewX1, previewY1);
        foreground.fill(255);
        foreground.stroke(0);
        foreground.rectMode(CORNER);
      } else if (validAction && selectedTool === "bond") {
        bond(previewX1, previewY1, previewX2, previewY2, bondType, foreground);
      }
      // copy buffers to screen when not in the intro
      if (!intro || frameCount >= INTRO_FADE_START_FRAME) {
        image(middleground, 0, 0, windowWidth, windowHeight);
        image(foreground, 0, 0, windowWidth, windowHeight);
      }
    }
    // render the intro screen
    if (intro) {
      if (frameCount < INTRO_FADE_END_FRAME) {
        foreground.stroke(255);
        if (frameCount > INTRO_FADE_START_FRAME) {
          foreground.fill(255,255-(frameCount-60)/60*255);
          foreground.rect(0,0,windowWidth,windowHeight);
          foreground.fill(0,255-(frameCount-60)/60*255);
        } else {      
          foreground.fill(255);
          foreground.rect(0,0,windowWidth,windowHeight);
          foreground.fill(0);
        }
        if (frameCount === INTRO_FADE_START_FRAME) {
          // no need to render the background while the intro at full opacity, so only start rendering it after 60 frames
          renderFrame = true;
          renderMiddleground = true;
        }
        if (frameCount === 1 || frameCount > INTRO_FADE_START_FRAME) {
          foreground.textSize(144);
          foreground.text("KyneDraw",0,windowHeight/2,windowWidth);
          foreground.textSize(36);
          foreground.text(tip,0,windowHeight*3/4,windowWidth)
          foreground.textSize(20);
          foreground.stroke(0);
          image(foreground, 0, 0, windowWidth, windowHeight);
        }
      } else if (frameCount >= INTRO_FADE_END_FRAME) {
        intro = false;
      }
    } else {
    // pause rendering during inactivity and when not in intro
      if (previousMouseX === cachedMouseX && previousMouseY === cachedMouseY) {
        renderFrame = false;
      } else {
        previousMouseX = cachedMouseX;
        previousMouseY = cachedMouseY;
      }
    }
  } catch (err) {
    // print error and debug message if something happens
    document.getElementById("error").style.display = "block";
    let errorMessage = document.createElement("pre");
    errorMessage.appendChild(document.createTextNode(err.stack)); // stack trace
    document.getElementById("error").appendChild(errorMessage);
    clear();
    image(middleground, 0, windowHeight*0.2, windowWidth*0.8, windowHeight*0.8);
    image(foreground, 0, windowHeight*0.2, windowWidth*0.8, windowHeight*0.8);
    noLoop();
  }
}

function mouseDragged() {
  renderFrame = true;
  renderMiddleground = true;
  mousePressed = true;
}

function mouseMoved() {
  renderFrame = true;
}

function mouseReleased() {
  renderFrame = true;
  mousePressed = false;
}

function toRadians(angle) {
  return angle * (Math.PI/180);
}

function toDegrees(angle) {
  return angle * (180/Math.PI);
}

function selectBox(id) {
  if (id !== 0) {
    buttonClicked = true;
  }
  selectedBox = id;
  renderFrame = true;
  renderMiddleground = true;
}

function lineOffset(x1,y1,x2,y2,offset,frame) {
  let angle = findBondAngle(x1,y1,x2,y2);
  frame.line(x1-Math.sin(toRadians(angle))*offset, y1-Math.cos(toRadians(angle))*offset, x2-Math.sin(toRadians(angle))*offset, y2-Math.cos(toRadians(angle))*offset);
}

/**
 * Returns the closest Atom to a point (x, y) that is to be the endpoint of a bond with selectedAtom in network, optionally ignoring optionalIgnoreAtom. Returns null if the Atom already has a bond with selectedAtom.
 * @param {Number} x 
 * @param {Number} y 
 * @param {Atom} selectedAtom 
 * @param {Array} network 
 * @param {Atom} optionalIgnoreAtom 
 * @returns {Atom}
 */
function findClosestDestinationAtom(x,y,selectedAtom,network, optionalIgnoreAtom = []) {
  let closestDistance = DESTINATION_DISTANCE;
  let closestDestinationAtom = [];
  let currentAtom;
  let distance; 
  let validAction = true;
  for (let i = 0; i < network.length; i++) {
    currentAtom = network[i];
    if (!currentAtom.deleted && (optionalIgnoreAtom.length === 0 || currentAtom.id !== optionalIgnoreAtom.id)) {
      distance = pointDistance(x,y,currentAtom.x,currentAtom.y);
      if (distance < DESTINATION_DISTANCE && distance < closestDistance && validAction) {
        if (selectedAtom.length !== 0) {
          // check if the currentAtom is already bonded to the selectedAtom
          for (let j = 0; j < selectedAtom.bondIdList.length; j++) {
            if (selectedAtom.bondIdList[j] === currentAtom.id) {
              validAction = false;
              closestDestinationAtom = null;
            }
          }
        }
        if (validAction) {
          closestDistance = distance;
          closestDestinationAtom = currentAtom;
        }
      }
    }
  }
  return closestDestinationAtom;
}

/**
 * Returns the closest Atom in network to a point (x, y), optionally ignoring a specified atom ignoreAtom
 * @param {Number} x 
 * @param {Number} y 
 * @param {Atom} ignoreAtom 
 * @param {Array} network 
 * @returns {Atom}
 */
function findClosestAtom(x,y,ignoreAtom,network) {
  let closestDistance = DESTINATION_DISTANCE;
  let closestAtom = [];
  let currentAtom;
  let distance; 
  for (let i = 0; i < network.length; i++) {
    currentAtom = network[i];
    if (!currentAtom.deleted) {
      distance = pointDistance(x,y,currentAtom.x,currentAtom.y);
      if (distance < DESTINATION_DISTANCE && distance < closestDistance && currentAtom.id !== ignoreAtom.id) {
        closestDistance = distance;
        closestAtom = currentAtom;
      }
    }
  }
  return closestAtom;
}

function windowResized() {
  drawBackground();
}

function drawBackground() {
  if (windowWidth != Math.max(window.innerWidth-20,MIN_WIDTH) || windowHeight != Math.max(window.innerHeight-20,MIN_HEIGHT)) {
    windowWidth = Math.max(window.innerWidth-20,MIN_WIDTH);
    windowHeight = Math.max(window.innerHeight-20,MIN_HEIGHT);
    resizeCanvas(windowWidth,windowHeight);
    var newGraphics = createGraphics(windowWidth,windowHeight);
    newGraphics.remove();
    var newGraphics = createGraphics(windowWidth,windowHeight);
    middleground = newGraphics;
    newGraphics.remove();
    middleground.textSize(20);
    middleground.textAlign(CENTER, CENTER);
    var newGraphics = createGraphics(windowWidth,windowHeight);
    foreground = newGraphics;
    newGraphics.remove();
    foreground.textSize(20);
    foreground.textAlign(CENTER, CENTER);
  }
  renderFrame = true;
  renderMiddleground = true;
}

function pointDistance(x1, y1, x2, y2) {
  return Math.sqrt((y2-y1)**2 + (x2-x1)**2);
}

function distanceToBond(x, y, x1, y1, x2, y2) {

  // taken from https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment/6853926#6853926

  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;

  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0) //in case of 0 length line
      param = dot / len_sq;

  var xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  var dx = x - xx;
  var dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function sideOfBond(x, y, x1, y1, x2, y2) {
  // this is the cross product of AB and AP, where A is x1,y1, B is x2,y2, and P is x,y
  return (x-x1)*(y2-y1) - (y-y1)*(x2-x1);
}

function findBondAngle(x1,y1,x2,y2) {
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

function highlightedBond(x1,y1,x2,y2,num,colorArray,frame) {
  frame.stroke(colorArray);
  frame.strokeWeight(3);
  bond(x1,y1,x2,y2,num,frame);
  frame.strokeWeight(1);
  frame.stroke(0);
}

function bond(x1,y1,x2,y2,num,frame,optionalOrientation = "left") {
  if (num > 3) {
    throw new Error ("Too many bonds!");
  } else if (num < 1) {
    throw new Error ("Negative or zero bonds!");
  }
  if (num === 2 && optionalOrientation === "middle") {
    lineOffset(x1,y1,x2,y2,MULTIBOND_SEPARATION/2,frame);
    lineOffset(x1,y1,x2,y2,-MULTIBOND_SEPARATION/2,frame);
  } else {
    frame.line(x1,y1,x2,y2);
    if (num === 3 || num === 2 && optionalOrientation === "left") {
      lineOffset(x1,y1,x2,y2,MULTIBOND_SEPARATION,frame);
    }
    if (num === 3 || num === 2 && optionalOrientation === "right") {
      lineOffset(x1,y1,x2,y2,-MULTIBOND_SEPARATION,frame);
    }
  }
}

function maxBonds(element) {
  if (element === "S") {
    return 6;
  } else if (element === "C" || element === "N") {
    return 4;
  } else if (element === "O") {
    return 2;
  } else if (element === "Br" || element === "Cl" || element === "Ts" || element === "I" || element === "F" || element === "OTBS") {
    return 1;
  } else {
    return -1;
  }
}

function valenceOf(element) {
  // TODO: add this to the prototype of the Atom class
  if (element === "C") {
    return 4;
  } else if (element === "N") {
    return 3;
  } else if (element === "O" || element === "S") {
    return 2;
  } else if (element === "Br" || element === "Cl" || element === "Ts" || element === "I" || element === "F" || element === "OTBS") {
    return 1;
  } else {
    return -1;
  }
}

function valenceElectronsOf(element) {
  return fullValenceElectronsOf(element) - valenceOf(element);
}

function fullValenceElectronsOf(element) {
  // TODO: maybe make this function work for atoms that don't make octets? probably not useful for organic chemistry
  return 8;
}

function mouseClicked() {
  somethingClicked = true;
}

function storeSettings(item) {
  switch (item) {
    case "selectedTool":
      localStorage.setItem("selectedTool", selectedTool);
      break;
    case "element":
      localStorage.setItem("element", element);
      break;
    case "bondType":
      localStorage.setItem("bondType", bondType);
      break;
    case "angleSnap":
      localStorage.setItem("angleSnap", angleSnap);
      break;
  }
}

function retrieveSettings() {
  selectedTool = localStorage.getItem("selectedTool");
  element = localStorage.getItem("element");
  bondType = parseInt(localStorage.getItem("bondType"));
  if (localStorage.getItem("angleSnap") === "false") {
    angleSnap = false;
  } else {
    // default when angleSnap is not stored in localStorage
    angleSnap = true;
    if (localStorage.getItem("angleSnap") !== "true") {
      // if it doesn't exist or has been changed to something else, set it to a default
      localStorage.setItem("angleSnap", "true");
    }
  }
  if (angleSnap) {
    document.getElementById("snap").setAttribute("checked", "checked");
  } else {
    document.getElementById("freeform").setAttribute("checked", "checked");
  }
  switch(selectedTool) {
    case "bond":
      switch (bondType) {
        case 1:
          document.getElementById("single").setAttribute("checked", "checked");
          break;
        case 2:
          document.getElementById("double").setAttribute("checked", "checked");
          break;
        case 3:
          document.getElementById("triple").setAttribute("checked", "checked");
          break;
        default:
          bondType = 1;
          localStorage.setItem("bondType", 1);
          document.getElementById("single").setAttribute("checked", "checked");
          break;
      }
      break;
    case "atomDrag":
      document.getElementById("atom-bond-drag").setAttribute("checked", "checked");
      break;
    case "moleculeDrag":
      document.getElementById("molecule-drag").setAttribute("checked", "checked");
      break;
    case "atomDelete":
      document.getElementById("atom-bond-delete").setAttribute("checked", "checked");
      break;
    case "moleculeDelete":
      document.getElementById("molecule-delete").setAttribute("checked", "checked");
      break;
    case "atom":
      switch (element) {
        case "C":
          document.getElementById("carbon").setAttribute("checked", "checked");
          break;
        case "O":
          document.getElementById("oxygen").setAttribute("checked", "checked");
          break;
        case "N":
          document.getElementById("nitrogen").setAttribute("checked", "checked");
          break;
        case "Br":
          document.getElementById("bromine").setAttribute("checked", "checked");
          break;
        case "Cl":
          document.getElementById("chlorine").setAttribute("checked", "checked");
          break;
        case "C":
          document.getElementById("carbon").setAttribute("checked", "checked");
          break;
        default:
          element = "C";
          element = localStorage.setItem("element", "C");
          document.getElementById("carbon").setAttribute("checked", "checked");
          break;
      }
      break;
    case "chargeH":
      switch(element) {
        case "-2𝑒":
          document.getElementById("add-charge").setAttribute("checked", "checked");
          break;
        case "+2𝑒":
          document.getElementById("subtract-charge").setAttribute("checked", "checked");
          break;
        case "+H":
          document.getElementById("add-h").setAttribute("checked", "checked");
          break;
        case "-H":
          document.getElementById("subtract-h").setAttribute("checked", "checked");
          break;
        default:
          element = "-2𝑒";
          localStorage.setItem("element", "-2𝑒");
          document.getElementById("add-charge").setAttribute("checked", "checked");
          break;
      }
      break;
    default:
      // default when there is no or an invalid selectedTool saved in localStorage
      selectedTool = "bond";
      bondType = 1;
      localStorage.setItem("selectedTool", "bond");
      localStorage.setItem("bondType", "1");
      document.getElementById("single").setAttribute("checked", "checked");
      break;
  }
}

function clickButton(selectedBox) {
  switch (selectedBox) {
    case -1:
      // -1 is when the dropdown menu heading is clicked, so do nothing
      break;
    case 1:
      bondType = selectedBox;
      selectedTool = "bond";
      storeSettings("selectedTool");
      storeSettings("bondType");
      break;
    case 2:
      bondType = selectedBox;
      selectedTool = "bond";
      storeSettings("selectedTool");
      storeSettings("bondType");
      break;
    case 3:
      bondType = selectedBox;
      selectedTool = "bond";
      storeSettings("selectedTool");
      storeSettings("bondType");
      break;
    case 4:
      angleSnap = false;
      storeSettings("angleSnap");
      break;
    case 5:
      angleSnap = true;
      storeSettings("angleSnap");
      break;
    case 6:
      element = "C"
      selectedTool = "atom";
      storeSettings("selectedTool");
      storeSettings("element");
      break;
    case 7:
      element = "O"
      selectedTool = "atom";
      storeSettings("selectedTool");
      storeSettings("element");
      break;
    case 8:
      element = "N"
      selectedTool = "atom";
      storeSettings("selectedTool");
      storeSettings("element");
      break;
    case 9:
      element = "Br"
      selectedTool = "atom";
      storeSettings("selectedTool");
      storeSettings("element");
      break;
    case 10:
      element = "Cl"
      selectedTool = "atom";
      storeSettings("selectedTool");
      storeSettings("element");
      break;
    case -6:
      element = "S"
      selectedTool = "atom";
      storeSettings("selectedTool");
      storeSettings("element");
      break;
    case 11:
      network = [];
      molecules = [];
      nextNodeID = 0;
      nextMoleculeID = 0;
      break;
    case 12:
      let startingID = nextNodeID;
      let x;
      let y;
      if (hackerman) {
        // allow random molecules to go anywhere in hackerman
        x = Math.random()*windowWidth;
        y = Math.random()*windowHeight;
      } else {
        // keep random molecules close to the center of the screen
        x = windowWidth/2+(Math.random()-0.5)*windowWidth/2;
        y = windowHeight/2+(Math.random()-0.5)*windowHeight/2;
      }
      network.push(new Atom(nextNodeID, "C", x, y, 0, 0, valenceOf("C"), valenceElectronsOf("C") - valenceOf("C"), false, [], [], [], nextMoleculeID, []));
      network[nextNodeID].updateNextBondAngleList();
      molecules.push(new Molecule(nextMoleculeID, x, y, x, y, false, [nextNodeID]));
      nextNodeID++;
      nextMoleculeID++;
      let generating = true;
      let minSize = 3;
      let randomAtom;
      let randomNum;
      let randomElement;
      let randomBondNumber;
      while (generating) {
        // only makes a randomAtom that is in the molecule that has just been created
        // No need to worry about race conditions because, if the user adds a new atom or something, that isn't processed until the next frame, and if the user presses the RANDOM MOLECULE twice in one frame, it is still only processed once
        randomAtom = network[startingID + Math.floor(Math.random() * (nextNodeID-startingID))];
        randomNum = Math.random();
        if (randomNum < 0.85) {
          randomElement = "C";
        } else if (randomNum < 0.94) {
          randomElement = "O"
        } else if (randomNum < 0.97) {
          randomElement = "N";
        } else {
          randomElement = "Br";
        }
        randomNum = Math.random();
        if (randomNum < 0.8) {
          randomBondNumber = 1;
        } else if (randomNum < 0.92) {
          randomBondNumber = 2;
        } else {
          randomBondNumber = 3;
        }
        if (randomAtom.numBonds + randomBondNumber <= valenceOf(randomAtom.name)) {
          // a similar condition is checked in insertAtom, but that uses maxBonds instead of valenceOf, which somtimes randomly makes charges, which aren't very desirable
          randomAtom.insertAtom(randomElement, randomBondNumber, true);
        }
        if (Math.random() > 0.9 && molecules[network[startingID].moleculeID].atomIDs.length > minSize) {
          generating = false;
        }
      }
      break;
    case 13:
      hackerman = !hackerman;
      break;
    case 14:
      selectedTool = "atomDrag";
      storeSettings("selectedTool");
      break;
    case 15:
      selectedTool = "moleculeDrag";
      storeSettings("selectedTool");
      break;
    case 16:
      selectedTool = "atomDelete";
      storeSettings("selectedTool");
      break;
    case 17:
      selectedTool = "moleculeDelete";
      storeSettings("selectedTool");
      break;
    case -2:
      selectedTool = "chargeH";
      element = "-2𝑒";
      storeSettings("selectedTool");
      storeSettings("element");
      break;
    case -3:
      selectedTool = "chargeH";
      element = "+2𝑒";
      storeSettings("selectedTool");
      storeSettings("element");
      break;
    case -4:
      selectedTool = "chargeH";
      element = "+H";
      storeSettings("selectedTool");
      storeSettings("element");
      break;
    case -5:
      selectedTool = "chargeH";
      element = "-H";
      storeSettings("selectedTool");
      storeSettings("element");
      break;
    case 19:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        } 
        currentAtom.alkeneAdditionOf("O","");
      }
      break;
    case 20:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("O","",2,1);
      }
      break;
    case 21:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl()) {
          let adjacentAtom = network[currentAtom.bondIdList[0]]; // carbon atom that the oxygen is attached to
          let mostSubstitutedAtom = [];
          for (let j = 0; j < adjacentAtom.bondIdList.length; j++) { // look at the atoms attached to the adjacentAtom
            let adjacentAdjacentAtom = network[adjacentAtom.bondIdList[j]];
            if (adjacentAdjacentAtom.name != "C" || adjacentAdjacentAtom.id === currentAtom.id || adjacentAdjacentAtom.numBonds >= maxBonds(adjacentAdjacentAtom.name)) {
              continue;
            } else if (mostSubstitutedAtom.length === 0 || adjacentAdjacentAtom.isMoreSubstitutedThan(mostSubstitutedAtom)) {
              mostSubstitutedAtom = adjacentAdjacentAtom; // TODO: consider what happens when equally substituted
            }
          }
          if (mostSubstitutedAtom.length !== 0) {
            // remove hydroxyl group (currentAtom)
            adjacentAtom.removeBondWith(currentAtom);
            currentAtom.delete();
            mostSubstitutedAtom.updateNextBondAngleList();
            // add another bond to the mostSubstitutedAtom to the adjacentAtom
            for (let j = 0; j < mostSubstitutedAtom.bondIdList.length; j++) {
              if (mostSubstitutedAtom.bondIdList[j] === adjacentAtom.id) {
                mostSubstitutedAtom.bondTypeList[j]++;
                mostSubstitutedAtom.numBonds++;
              }
            }
            for (let j = 0; j < adjacentAtom.bondIdList.length; j++) {
              if (adjacentAtom.bondIdList[j] === mostSubstitutedAtom.id) {
                // add bond from adjacentAtom to the mostSubstitutedAtom
                adjacentAtom.bondTypeList[j]++;
                adjacentAtom.changeNumBonds(1);
              }
            }
          }
        }
      }
      break;
    case 22:
      // TODO: finish this and make this only accept antiperiplanar
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.isLeavingGroup()) {
          currentAtom.isMoreSubstitutedThan
        }
      }
    case 23:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("Br","");
      }
      break;
    case 24:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("","Br");
      }
      break;
    case 25:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("Br","Br");
      }
      break;
    case 26:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("O","Br");
      }
      break;
    case 27:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        // this technically doesn't work for things double bonded to a benzene ring, but that's not possible anyways
        if (!currentAtom.isBenzene()) {
          let changed = false;
          for (let j = 0; j < currentAtom.bondTypeList.length; j++) {
            if (currentAtom.bondTypeList !== 1) {
              currentAtom.bondTypeList[j] = 1;
              changed = true;
            }
          }
          if (changed) {
            currentAtom.updateNumBonds();
          }
        }
      }
    case 28:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("O","O");
      }
      break;
    case 29:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("","O");
      }
      break;
    case 30:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isKetone()) {
          adjacentAtom = network[currentAtom.bondIdList[0]];
          currentAtom.bondTypeList[0] = 1;
          currentAtom.changeNumBonds(-1);
          for (let j = 0; j < adjacentAtom.bondTypeList.length; j++) {
            if (adjacentAtom.bondIdList[j] === currentAtom.id) {
              adjacentAtom.bondTypeList[j] = 1;
              adjacentAtom.updateNumBonds();
            }
          }
        }
      }
      break;
    case 31:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl(currentAtom)) {
          adjacentAtom = network[currentAtom.bondIdList[0]];
          if (adjacentAtom.numBonds >= maxBonds(adjacentAtom.name)) { // too many bonds to form another
            break;
          }
          currentAtom.bondTypeList[0] = 2;
          currentAtom.changeNumBonds(1);
          for (let j = 0; j < adjacentAtom.bondTypeList.length; j++) {
            if (adjacentAtom.bondIdList[j] === currentAtom.id) {
              adjacentAtom.bondTypeList[j] = 2;
              adjacentAtom.updateNumBonds();
            }
          }
        }
      } 
      break;
    case 32:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl()) {
          currentAtom.name = "Br";
          currentAtom.updateNumBonds();
        }
      }
      break;
    case 33:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl()) {
          currentAtom.name = "Cl";
          currentAtom.updateNumBonds();
        }
      }
      break;
    case 34:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl()) {
          currentAtom.name = "Ts";
          currentAtom.updateNumBonds();
        }
      }
      break;
    case 35:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("O","");
      }
      break;
    case 36:
      // TODO: many possible products!!
      let terminalAlkenes = [];
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.numBonds === 2 && currentAtom.bondIdList.length === 1 && currentAtom.name === "C") {
          let adjacentAtom = network[currentAtom.bondIdList[0]];
          if (adjacentAtom.name === "C") {
            terminalAlkenes.push([currentAtom,adjacentAtom]);
          }
        }
      }
      if (terminalAlkenes.length >= 2) {
        for (let i = 0; i < terminalAlkenes.length; i+=2) {
          let currentAtom1 = terminalAlkenes[i][0];
          let adjacentAtom1 = terminalAlkenes[i][1];
          let currentAtom2 = terminalAlkenes[i+1][0];
          let adjacentAtom2 = terminalAlkenes[i+1][1];
          if (adjacentAtom1.bondIdList.includes(adjacentAtom2.id)) {
            // doesn't work on but-1,3-ene
            continue;
          }
          currentAtom1.delete();
          currentAtom2.delete();
          adjacentAtom1.createBondWith(adjacentAtom2, 2);
        }
      }
      break;
    case 37:
      // TODO: several possible products
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.name !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          if (currentAtom.bondTypeList[j] === 3) {
            currentAtom.changeNumBonds(-1);
            currentAtom.bondTypeList[j] = 2;
            let adjacentAtom = network[currentAtom.bondIdList[j]];
            adjacentAtom.changeNumBonds(-1);
            adjacentAtom.bondTypeList[adjacentAtom.bondIdList.indexOf(currentAtom.id)] = 2;
          }
        }
      }
      break;
    case 38:
      // TODO: several possible products
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.name !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          if (currentAtom.bondTypeList[j] === 3) {
            currentAtom.changeNumBonds(-1);
            currentAtom.bondTypeList[j] = 2;
            let adjacentAtom = network[currentAtom.bondIdList[j]];
            adjacentAtom.changeNumBonds(-1);
            adjacentAtom.bondTypeList[adjacentAtom.bondIdList.indexOf(currentAtom.id)] = 2;
          }
        }
      }
      break;
    case 39:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.name !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          if (currentAtom.bondTypeList[j] === 2 || currentAtom.bondTypeList[j] === 3) {
            // count number of atoms within a region of 1.1 BOND_LENGTH from the bond on either side
            let adjacentAtom = network[currentAtom.bondIdList[j]];
            let side1 = 0;
            let side2 = 0;
            let bondAngle = currentAtom.findBondAngleWith(adjacentAtom);
            // TODO: yuck, O(n^2)
            for (let k = 0; k < network.length; ++k) {
              let currentAtom2 = network[k];
              if (currentAtom2.distanceToBondOf(currentAtom, adjacentAtom) < 1.1 * BOND_LENGTH) {
                let side = currentAtom2.sideOfBondOf(currentAtom, adjacentAtom);
                if (side < 0) {
                  side1++;
                } else if (side > 0) {
                  side2++;
                }
              }
            }
            if (side1 > side2) {
              bondAngle = (bondAngle + 60) % 360;
            } else {
              bondAngle = (bondAngle + 300) % 360;
            }
            let newID = nextNodeID;
            currentAtom.bondTypeList[j]--;
            currentAtom.changeNumBonds(-1);
            currentAtom.insertAtom("C", 1, false, bondAngle);
            adjacentAtom.bondTypeList[adjacentAtom.bondIdList.indexOf(currentAtom.id)]--;
            adjacentAtom.changeNumBonds(-1);
            adjacentAtom.createBondWith(network[newID], 1);
            // does not repeat for alkynes? I think
          }
        }
      }
      break;
    case 40:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.name !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          currentAtom.alkyneAdditionOf("O","",2,1);
        }
      }
      break;
    case 41:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.name !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          currentAtom.alkyneAdditionOf("","O",1,2);
        }
      }
      break;
    case 42:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.name !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          if (currentAtom.bondTypeList[j] === 2) {
            // only occurs for alkenes, count number of atoms within a region of 1.1 BOND_LENGTH from the bond on either side
            let adjacentAtom = network[currentAtom.bondIdList[j]];
            let side1 = 0;
            let side2 = 0;
            let bondAngle = currentAtom.findBondAngleWith(adjacentAtom);
            // TODO: yuck, O(n^2)
            for (let k = 0; k < network.length; ++k) {
              let currentAtom2 = network[k];
              if (currentAtom2.distanceToBondOf(currentAtom, adjacentAtom) < 1.1 * BOND_LENGTH) {
                let side = currentAtom2.sideOfBondOf(currentAtom, adjacentAtom);
                if (side < 0) {
                  side1++;
                } else if (side > 0) {
                  side2++;
                }
              }
            }
            if (side1 > side2) {
              bondAngle = (bondAngle + 60) % 360;
            } else {
              bondAngle = (bondAngle + 300) % 360;
            }
            let newID = nextNodeID;
            currentAtom.bondTypeList[j]--;
            currentAtom.changeNumBonds(-1);
            currentAtom.insertAtom("O", 1, false, bondAngle);
            adjacentAtom.bondTypeList[adjacentAtom.bondIdList.indexOf(currentAtom.id)]--;
            adjacentAtom.changeNumBonds(-1);
            adjacentAtom.createBondWith(network[newID], 1);
            // does not repeat for alkynes? I think
          }
        }
      }
      break;
    case 43:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("O","O");
      }
      break;
    case 44:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.name !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          let adjacentAtom = network[currentAtom.bondIdList[j]];
          if (adjacentAtom.name === "C") {
            let bondType = currentAtom.bondTypeList[j];
            if (bondType === 2 || bondType === 3) {
              currentAtom.removeBondWith(adjacentAtom);
              currentAtom.insertAtom("O", 2, false);
              adjacentAtom.insertAtom("O", 2, false);
              if (bondType === 3) {
                currentAtom.insertAtom("O", 1, false);
                adjacentAtom.insertAtom("O", 1, false);
              }
            }
          }
        }
      }
      break;
    case 45:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.name !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          let adjacentAtom = network[currentAtom.bondIdList[j]];
          if (adjacentAtom.name === "C") {
            let bondType = currentAtom.bondTypeList[j];
            if (bondType === 2 || bondType === 3) {
              currentAtom.removeBondWith(adjacentAtom);
              currentAtom.insertAtom("O", 2, false);
              adjacentAtom.insertAtom("O", 2, false);
              if (bondType === 3) {
                currentAtom.insertAtom("O", 1, false);
                adjacentAtom.insertAtom("O", 1, false);
              }
              // turn aldehydes into carboxylic acids
              if (currentAtom.numBonds < maxBonds(currentAtom.name)) {
                currentAtom.insertAtom("O", 1, false);
              }
              if (adjacentAtom.numBonds < maxBonds(adjacentAtom.name)) {
                adjacentAtom.insertAtom("O", 1, false);
              }
              // do it again to turn formaldehyde into carbonic acid
              if (currentAtom.numBonds < maxBonds(currentAtom.name)) {
                currentAtom.insertAtom("O", 1, false);
              }
              if (adjacentAtom.numBonds < maxBonds(adjacentAtom.name)) {
                adjacentAtom.insertAtom("O", 1, false);
              }
            }
          }
        }
      }
      break;
    case 46:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHalide()) {
          currentAtom.name = "Mg" + currentAtom.name;
        }
      }
      break;
    case 47:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHalide()) {
          currentAtom.name = "Li";
        }
      }
      break;
    case 48:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isLithiate()) {
          currentAtom.name = "CuLi×2";
        }
      }
      break;
    case 49:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl(currentAtom)) {
          adjacentAtom = network[currentAtom.bondIdList[0]];
          if (adjacentAtom.numBonds >= maxBonds(adjacentAtom.name)) { // too many bonds to form another
            break;
          }
          currentAtom.bondTypeList[0] = 2;
          currentAtom.changeNumBonds(1);
          for (let j = 0; j < adjacentAtom.bondTypeList.length; j++) {
            if (adjacentAtom.bondIdList[j] === currentAtom.id) {
              adjacentAtom.bondTypeList[j] = 2;
              adjacentAtom.updateNumBonds();
            }
          }
        }
      } 
      break;
    case 50:
      // TODO: finish this
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isKetone(currentAtom)) {
          adjacentAtom = network[currentAtom.bondIdList[0]];
          currentAtom.bondTypeList[0] = 1;
          currentAtom.changeNumBonds(-1);
          for (let j = 0; j < adjacentAtom.bondTypeList.length; j++) {
            if (adjacentAtom.bondIdList[j] === currentAtom.id) {
              adjacentAtom.bondTypeList[j] = 1;
              adjacentAtom.updateNumBonds();
            }
          }
          // turn aldehyde into carboxylic acid
          if (adjacentAtom.numBonds < maxBonds(adjacentAtom.name)) {
            adjacentAtom.insertAtom("O", 1, false);
          }
        }
      }
      break;
    case 51:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl()) {
          currentAtom.name = "OTBS";
          currentAtom.numH = 0;
        }
      }
      break;
    case 52:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isProtectedHydroxyl()) {
          currentAtom.name = "O";
          currentAtom.numH = 1;
        }
      }
      break;
    case 0: // when no box is selected
    if (selectedTool === "bond") {
      element = "C";
      // -1 means invalid bond TODO: change this, bondAngle is not needed elsewhere anymore
      if (selectedAtom.length === 0 && selectedBond.length !== 0 && selectedBond[2] !== bondType) {
        // TODO: unoptimized
        // change number of bonds between two atoms if there is a selectedBond
        for (let i = 0; i < selectedBond[0].bondTypeList.length; i++) {
          if (selectedBond[0].bondIdList[i] === selectedBond[1].id) {
            selectedBond[0].bondTypeList[i] = bondType;
            selectedBond[0].changeNumBonds(bondType - selectedBond[2]);
            if (angleSnap) {
              let selectedMolecule = molecules[selectedBond[0].moleculeID];
              let largerBranchNode;
              let smallerBranchNode;
              if (selectedMolecule.compareBranchSize(selectedBond[0],selectedBond[1]) === 0) {
                largerBranchNode = selectedBond[0];
                smallerBranchNode = selectedBond[1];
              } else {
                largerBranchNode = selectedBond[1];
                smallerBranchNode = selectedBond[0];
              }
              let bondAngleShift = largerBranchNode.calculateNextBondAngle(bondType, largerBranchNode.bondIdList.length-1, [smallerBranchNode]) - largerBranchNode.findBondAngleWith(smallerBranchNode);
              if (bondAngleShift !== 0) {
                smallerBranchNode.rotateBranchAboutBondWith(largerBranchNode,bondAngleShift,true);
              }
              bondAngleShift = smallerBranchNode.calculateNextBondAngle(bondType, smallerBranchNode.bondIdList.length-1, [largerBranchNode]) - smallerBranchNode.findBondAngleWith(largerBranchNode);
              if (bondAngleShift !== 0) {
                smallerBranchNode.rotateBranchAboutBondWith(largerBranchNode,bondAngleShift,false);
              }
            }
          }
        }
        for (let i = 0; i < selectedBond[1].bondTypeList.length; i++) {
          if (selectedBond[1].bondIdList[i] === selectedBond[0].id) {
            selectedBond[1].bondTypeList[i] = bondType;
            selectedBond[1].changeNumBonds(bondType - selectedBond[2]);
          }
        }
      } else if (!validAction) {
        // invalid bond
        return false;
      } else {
        // create new atoms if necessary, then create a bond between the two atoms
        // doesn't use insertAtom because the behavior should be the same as seen on the preview
        let atom1;
        let atom2;
        if (selectedAtom.length !== 0) {
          atom1 = selectedAtom;
        } else {
          network.push(new Atom(nextNodeID, element, previewX1, previewY1, 0, 0, valenceOf(element), valenceElectronsOf(element) - valenceOf(element), false, [], [], [], -1, []));
          atom1 = network[nextNodeID];
          nextNodeID++;
        }
        if (destinationAtom.length !== 0) {
          atom2 = destinationAtom;
        } else {
          network.push(new Atom(nextNodeID, element, previewX2, previewY2, 0, 0, valenceOf(element), valenceElectronsOf(element) - valenceOf(element), false, [], [], [], -1, []));
          atom2 = network[nextNodeID];
          nextNodeID++;
        }
        atom1.createBondWith(atom2, bondType);
        // the molecule IDs are handled in createBondWith
        break;
      }
    } else if (selectedTool === "atom") {
      if (!validAction) {
        break;
      } else if (selectedAtom.length !== 0) {
        if (selectedAtom.name !== element) {
          selectedAtom.name = element;
          selectedAtom.updateNumBonds();
        }
      } else {
        network.push(new Atom(nextNodeID, element, previewX1, previewY1, 0, 0, valenceOf(element), valenceElectronsOf(element) - valenceOf(element), false, [], [], [], nextMoleculeID, []));
        molecules.push(new Molecule(nextMoleculeID, previewX1, previewY1, previewX1, previewY1, false, [nextNodeID]));
        network[nextNodeID].updateNextBondAngleList();
        nextNodeID++;
        nextMoleculeID++;
      }
    } else if (selectedTool === "chargeH") {
      // changes charge and numH such that this.numH + this.numBonds - this.charge = valenceOf(this.name), keeping numBonds constant
      if (selectedAtom.length !== 0 && validAction) {
        switch (element) {
          case "+H":
            selectedAtom.numH++;
            selectedAtom.charge++;
            selectedAtom.numLoneE -= 2;
            break;
          case "-H":
            selectedAtom.numH--;
            selectedAtom.charge--;
            selectedAtom.numLoneE += 2;
            break;
          case "-2𝑒":
            selectedAtom.charge += 2;
            selectedAtom.numLoneE -= 2;
            break;
          case "+2𝑒":
            selectedAtom.charge -= 2;
            selectedAtom.numLoneE += 2;
            break;
        }
      }
    } else if (selectedTool === "atomDelete") {
      if (selectedBond.length !== 0) {
        selectedBond[0].removeBondWith(selectedBond[1]);
      } else {
        selectedAtom.delete();
      }
    } else if (selectedTool === "moleculeDelete" && selectedMolecule.length !== 0) {
      selectedMolecule.delete();
    }
  }
  renderFrame = true;
  renderMiddleground = true;
}