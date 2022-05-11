#include <emscripten/val.h>
#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <string>
#include <math.h>
#include <numbers>
#include <iostream>
#include <fstream>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <memory>
#include <queue>
#include <boost/uuid/uuid.hpp>            // uuid class
#include <boost/uuid/uuid_generators.hpp> // generators
#include <boost/functional/hash.hpp>
// #include <boost/json.hpp>                    // parse JSON
   
namespace kynedraw
{
  class Molecule;
  class VisibleMolecule;
  class Bond;
  class VisibleBond;
  class Node;
  class VisibleNode;
  class Molecule {
    //
  };
  class Bond
  {
    //
  };
  class Node
  {
  protected:
    std::string name;
    int numBonds;
    int charge;
    int numH;
    int numLoneE;
    std::weak_ptr<kynedraw::Molecule> molecule;
    std::unordered_map<boost::uuids::uuid, std::weak_ptr<kynedraw::Bond>, boost::hash<boost::uuids::uuid>> bondList;
    std::unordered_map<boost::uuids::uuid, std::weak_ptr<kynedraw::Node>, boost::hash<boost::uuids::uuid>> nodeList;
  public:
    Node(std::string name)
    {
      this->name = name;
    }
  };
  class VisibleNode : protected Node
  {
  protected:
    double x;
    double y;
    double predictedNextBondAngleList[3];
  public:
    VisibleNode(std::string name, double x, double y) : Node(name)
    {
      this->x = x;
      this->y = y;
    }
    int get_x() const
    {
      return x;
    }
    void change_x(double change_x)
    {
      x += change_x;
    }
    void set_x(double x)
    {
      this->x = x;
    }
    int get_y() const
    {
      return y;
    }
    void change_y(double change_y)
    {
      y += change_y;
    }
    void set_y(double y)
    {
      this->y = y;
    }
  };
  class Network
  {
  protected:
    std::unordered_map<boost::uuids::uuid, kynedraw::VisibleNode, boost::hash <boost::uuids::uuid>> visibleNetwork;
    std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash <boost::uuids::uuid>> network;
    std::unordered_map<boost::uuids::uuid, kynedraw::VisibleBond, boost::hash <boost::uuids::uuid>> visibleBonds;
    std::unordered_map<boost::uuids::uuid, kynedraw::Bond, boost::hash <boost::uuids::uuid>> bonds;
  };
  class Preview : protected Network
  {
  protected:
    std::weak_ptr<kynedraw::VisibleNode> pivotNode;
  };
}

/*{
  {"bonds", -1},
  {"single", 1},
  {"double", 2},
  {"triple", 3},
  {"atoms", -1},
  {"carbon", 6},
  {"oxygen", 7},
  {"nitrogen", 8},
  {"bromine", 9},
  {"chlorine", 10},
  {"sulfur", -6},
  {"drag-delete-tools", -1},
  {"atom-bond-drag", 14},
  {"molecule-drag", 15},
  {"atom-bond-delete", 16},
  {"molecule-delete", 17},
  {"charge-h-tools", -1},
  {"add-charge", -2},
  {"subtract-charge", -3},
  {"add-h", -4},
  {"subtract-h", -5},
  {"snap", 5},
  {"freeform", 4},
  {"clear", 11},
  {"random", 12},
  {"hackerman", 13},
  {"sn-e", -1},
  {"alkene-addition", -1},
  {"ring-metathesis", 36},
  {"hbr-addition", 23},
  {"radical-hbr", 24},
  {"halogenation", 25},
  {"halohydrin-formation", 26},
  {"hydrogenation", 27},
  {"cis-hydrogenation", 37},
  {"trans-hydrogenation", 38},
  {"cyclopropanation", 39},
  {"alkene-oxidation", -1},
  {"acid-hydration", 19},
  {"oxymercuration", 28},
  {"hydroboration", 35},
  {"alkyne-hydration", 40},
  {"alkyne-hydroboration", 41},
  {"epoxidation", 42},
  {"dihydroxylation", 43},
  {"wacker-oxidation", 20},
  {"ozonolysis", 44},
  {"oxidative-cleavage", 45},
  {"alcohol-reactions", -1},
  {"gringard-formation", 46},
  {"organolithiate-formation", 47},
  {"organocopper-formation", 48},
  {"dehydration", 21},
  {"weak-reduction", 30},
  {"strong-reduction", 49},
  {"weak-oxidation", 31},
  {"jones-oxidation", 50},
  {"bromination", 32},
  {"chlorination", 33},
  {"tosylation", 34},
  {"hydroxyl-protection", 51},
  {"hydroxyl-unprotection", 52}
};*/

const std::unordered_map<std::string, int> buttonIDs = {
    {"bonds", -1},
    {"single", 10},
    {"double", 11},
    {"triple", 12},
    {"atoms", -2},
    {"hydrogen", 20},
    {"carbon", 21},
    {"oxygen", 22},
    {"nitrogen", 23},
    {"bromine", 24},
    {"chlorine", 25},
    {"sulfur", 26},
    {"drag-delete-tools", -3},
    {"atom-bond-drag", 30},
    {"molecule-drag", 31},
    {"atom-bond-delete", 32},
    {"molecule-delete", 33},
    {"charge-h-tools", -4},
    {"add-charge", 40},
    {"subtract-charge", 41},
    {"add-h", 42},
    {"subtract-h", 43},
    {"snap", 200},
    {"freeform", 201},
    {"clear", 202},
    {"random", 203},
    {"hackerman", 204},
    {"sn-e", -10},
    {"alkene-addition", -11},
    {"ring-metathesis", 111},
    {"hbr-addition", 112},
    {"radical-hbr", 113},
    {"halogenation", 114},
    {"halohydrin-formation", 115},
    {"hydrogenation", 116},
    {"cis-hydrogenation", 117},
    {"trans-hydrogenation", 118},
    {"cyclopropanation", 119},
    {"alkene-oxidation", -12},
    {"acid-hydration", 120},
    {"oxymercuration", 121},
    {"hydroboration", 122},
    {"alkyne-hydration", 123},
    {"alkyne-hydroboration", 124},
    {"epoxidation", 125},
    {"dihydroxylation", 126},
    {"wacker-oxidation", 127},
    {"ozonolysis", 128},
    {"oxidative-cleavage", 129},
    {"alcohol-reactions", -13},
    {"gringard-formation", 130},
    {"organolithiate-formation", 131},
    {"organocopper-formation", 132},
    {"dehydration", 133},
    {"weak-reduction", 134},
    {"strong-reduction", 135},
    {"weak-oxidation", 136},
    {"jones-oxidation", 137},
    {"bromination", 138},
    {"chlorination", 139},
    {"tosylation", 140},
    {"hydroxyl-protection", 141},
    {"hydroxyl-unprotection", 142}
};
const double pi = std::numbers::pi;
int FRAME_COUNT = 0;
double DEADZONE_WIDTH = 5;
double DEADZONE_HEIGHT = 5;
double BOND_LENGTH = 50;
emscripten::val window = emscripten::val::global("window");
emscripten::val document = emscripten::val::global("document");
emscripten::val localStorage = emscripten::val::global("localStorage");
boost::uuids::random_generator uuidGenerator;
std::string selectedTool;
std::string bondSnapSetting;
std::unordered_map<boost::uuids::uuid, kynedraw::VisibleNode, boost::hash <boost::uuids::uuid>> visibleNetwork;
std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash <boost::uuids::uuid>> network;
std::unordered_map<boost::uuids::uuid, kynedraw::VisibleNode, boost::hash <boost::uuids::uuid>> visiblePreview;
std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash <boost::uuids::uuid>> preview;

void render()
{
  // NOTE: if this is not defined in the function, embind throws an error at runtime
  emscripten::val canvas = document.call<emscripten::val>("getElementById", emscripten::val("canvas"));
  emscripten::val ctx = canvas.call<emscripten::val>("getContext", emscripten::val("2d"));

  ctx.call<void>("clearRect", 0, 0, canvas["width"], canvas["height"]);
  ctx.set("fillStyle", "green");
  ctx.call<void>("beginPath");
  ctx.call<void>("rect", 100 * sin(FRAME_COUNT / 360.0), 100 * cos(FRAME_COUNT / 360.0), 150, 100);
  ctx.call<void>("fill");
  ctx.call<void>("stroke");
  ctx.set("fillStyle", "red");
  ctx.call<void>("beginPath");
  ctx.call<void>("arc", 100 * sin(FRAME_COUNT / 360.0), 100 * cos(FRAME_COUNT / 360.0), 5, 0, 2 * pi);
  ctx.call<void>("stroke");
  for (const auto& [uuid, currentVisibleNode] : visibleNetwork)
  {
    ctx.call<void>("beginPath");
    ctx.call<void>("arc", currentVisibleNode.get_x(), currentVisibleNode.get_y(), 5, 0, 2 * pi);
    ctx.call<void>("stroke");
  }
  for (const auto& [uuid, currentVisiblePreviewNode] : visiblePreview)
  {
    ctx.call<void>("beginPath");
    ctx.call<void>("arc", currentVisiblePreviewNode.get_x(), currentVisiblePreviewNode.get_y(), 5, 0, 2 * pi);
    ctx.call<void>("stroke");
  }
  FRAME_COUNT++;
}

void AddButtonEventListeners(emscripten::val element, emscripten::val index, emscripten::val array)
{
  element.call<void>("addEventListener", emscripten::val("mousedown"), emscripten::val::module_property("ClickButton"));
  element.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("ClickButton"));
}

void AddToolButtonEventListener(emscripten::val element, emscripten::val index, emscripten::val array)
{
  element.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("StoreSelectedTool"));
}

void StoreSelectedTool(emscripten::val event)
{
  localStorage.call<void>("setItem", emscripten::val("selectedTool"), event["target"]["id"]);
}

void AddBondSnapButtonEventListener(emscripten::val element, emscripten::val index, emscripten::val array)
{
  element.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("StoreBondSnapSetting"));
}

void StoreBondSnapSetting(emscripten::val event)
{
  localStorage.call<void>("setItem", emscripten::val("bondSnapSetting"), event["target"]["id"]);
}

void ResetPreview(std::string tool, double pageX, double pageY)
{
  int toolID = buttonIDs.at(tool);
  preview.clear();
  visiblePreview.clear();
  switch (buttonIDs.at(tool)) {
    case 10:
      // single
      preview.try_emplace(uuidGenerator(), kynedraw::Node("C"));
      visiblePreview.try_emplace(uuidGenerator(), kynedraw::VisibleNode("C", pageX, pageY));
      preview.try_emplace(uuidGenerator(), kynedraw::Node("C"));
      visiblePreview.try_emplace(uuidGenerator(), kynedraw::VisibleNode("C", pageX+BOND_LENGTH*std::cos(pi*11/6), pageY+BOND_LENGTH*std::sin(pi*11/6)));
      break;
    case 21:
      // carbon
      preview.try_emplace(uuidGenerator(), kynedraw::Node("C"));
      visiblePreview.try_emplace(uuidGenerator(), kynedraw::VisibleNode("C", pageX, pageY));
      break;
  }
}

std::string RetrieveAndTickSetting(std::string settingType, std::string defaultName)
{
  emscripten::val storedValue = localStorage.call<emscripten::val>("getItem", emscripten::val(settingType));
  std::string value;
  // checks if there is such a stored value: typeOf will be "object" when the emscripten::val is null
  if (storedValue.typeOf().as<std::string>() == "string")
  {
    value = storedValue.as<std::string>();
  }
  else
  {
    value = defaultName;
  }
  // appends "-button" to the end of settingType, then gets the button with that id, then ticks it
  document.call<emscripten::val>("getElementById", emscripten::val(value + "-button")).call<void>("setAttribute", emscripten::val("checked"), emscripten::val("checked"));
  return value;
}

void InitializeAllSettings()
{
  selectedTool = RetrieveAndTickSetting("selectedTool", "single");
  bondSnapSetting = RetrieveAndTickSetting("bondSnapSetting", "freeform");

  // initialize the selectedTool at (0,0) because that is what static double previousPageX, previousPageY in MouseMove is initialized to
  ResetPreview(selectedTool, 0, 0);
}

void ClickButton(emscripten::val event)
{
  selectedTool = event["target"]["id"].as<std::string>();
  ResetPreview(selectedTool, event["pageX"].as<double>(), event["pageY"].as<double>());
  event.call<void>("stopPropagation");
}

void MouseMove(double pageX, double pageY, bool mouseIsPressed, double mouseDownPageX, double mouseDownPageY)
{
  static double previousPageX, previousPageY;
  if (mouseIsPressed && std::abs(mouseDownPageX - pageX) < DEADZONE_WIDTH && std::abs(mouseDownPageY - pageY) < DEADZONE_HEIGHT)
  {
    //
  } else {
    for (auto&[uuid, currentVisiblePreviewNode]: visiblePreview) {
      currentVisiblePreviewNode.change_x(pageX - previousPageX);
      currentVisiblePreviewNode.change_y(pageY - previousPageY);
    }
  }
  previousPageX = pageX;
  previousPageY = pageY;
}

void InteractWithCanvas(emscripten::val event)
{
  static double mouseDownPageX, mouseDownPageY;
  static bool mouseIsPressed;

  std::string eventName = event["type"].as<std::string>();
  double pageX = event["pageX"].as<double>();
  double pageY = event["pageY"].as<double>();

  // NOTE: mousemove fires before mousedown and mouseup on an animation frame, at least in Chrome
  if (eventName == "mousemove") {
    MouseMove(pageX, pageY, mouseIsPressed, mouseDownPageX, mouseDownPageY);
  } else if (eventName == "mousedown") {
    mouseDownPageX = pageX;
    mouseDownPageY = pageY;
    mouseIsPressed = true;
  } else if (eventName == "mouseup") {
    // TODO: make a dead zone so slightly dragging the mouse doesn't count as a drag, and also find out how to concatenate two maps
    // If mouseIsPressed is false and there is a mouseup event, that means that the mouse was clicked and dragged from a UI button to the canvas
    network.merge(preview);
    visibleNetwork.merge(visiblePreview);
    mouseIsPressed = false;
    ResetPreview(selectedTool, pageX, pageY);
  }
}

void ResizeCanvas(emscripten::val event)
{
  emscripten::val canvas = document.call<emscripten::val>("getElementById", emscripten::val("canvas"));
  canvas.set("width", window["innerWidth"]);
  canvas.set("height", window["innerHeight"]);
}

void RunMainLoop()
{
  emscripten_set_main_loop(render, 0, 1);
}

int main()
{
  window.call<void>("addEventListener", emscripten::val("resize"), emscripten::val::module_property("ResizeCanvas"));
  document.call<void>("addEventListener", emscripten::val("mousedown"), emscripten::val::module_property("InteractWithCanvas"));
  document.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("InteractWithCanvas"));
  document.call<void>("addEventListener", emscripten::val("mousemove"), emscripten::val::module_property("InteractWithCanvas"));

  // add event listeners, which search for button elements or for labels that are at the same level in the DOM tree as the radio buttons with the specified name
  // NOTE: this will affect EVERY <button> element. Not a problem for now...
  document.call<emscripten::val>("querySelectorAll", emscripten::val("[name=tool-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddToolButtonEventListener"));
  document.call<emscripten::val>("querySelectorAll", emscripten::val("[name=bond-snap-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddBondSnapButtonEventListener"));
  document.call<emscripten::val>("querySelectorAll", emscripten::val("button, [name=tool-selection-button] + label, [name=bond-snap-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddButtonEventListeners"));

  // initialize width and height of the canvas
  emscripten::val canvas = document.call<emscripten::val>("getElementById", emscripten::val("canvas"));
  canvas.set("width", window["innerWidth"]);
  canvas.set("height", window["innerHeight"]);

  // retrieve all settings from localStorage and set the appropriate boxes to "checked" and put the appropriate data into preview and visiblePreview
  InitializeAllSettings();

  RunMainLoop();
  return 0;
}

EMSCRIPTEN_BINDINGS(bindings)
{
  emscripten::function("InteractWithCanvas", InteractWithCanvas);
  emscripten::function("ResizeCanvas", ResizeCanvas);
  emscripten::function("ClickButton", ClickButton);
  emscripten::function("AddButtonEventListeners", AddButtonEventListeners);
  emscripten::function("AddToolButtonEventListener", AddToolButtonEventListener);
  emscripten::function("StoreSelectedTool", StoreSelectedTool);
  emscripten::function("AddBondSnapButtonEventListener", AddBondSnapButtonEventListener);
  emscripten::function("StoreBondSnapSetting", StoreBondSnapSetting); 
}