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
  class Bond;
  class Node;
  class Atom;
  class Molecule {
    //
  };
  class Bond
  {
    //
  };
  class Atom
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
    Atom(std::string name)
    {
      this->name = name;
    }
  };
  class Node : protected Atom
  {
    protected:
    double x;
    double y;
    double predictedNextBondAngleList[3];

    public:
    Node(std::string name, double x, double y) : Atom(name)
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
}

const double pi = std::numbers::pi;
int frameCount = 0;
emscripten::val window = emscripten::val::global("window");
emscripten::val document = emscripten::val::global("document");
emscripten::val localStorage = emscripten::val::global("localStorage");
boost::uuids::random_generator uuidGenerator;
std::string selectedTool;
std::string bondSnapSetting;
std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash < boost::uuids::uuid>> visibleNetwork;
std::unordered_map<boost::uuids::uuid, kynedraw::Atom, boost::hash < boost::uuids::uuid>> network;
std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash < boost::uuids::uuid>> visiblePreview;
std::unordered_map<boost::uuids::uuid, kynedraw::Atom, boost::hash < boost::uuids::uuid>> preview;
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

void render()
{
  // NOTE: if this is not defined in the function, embind throws an error at runtime
  emscripten::val canvas = document.call<emscripten::val>("getElementById", emscripten::val("canvas"));
  emscripten::val ctx = canvas.call<emscripten::val>("getContext", emscripten::val("2d"));

  ctx.call<void>("clearRect", 0, 0, canvas["width"], canvas["height"]);
  ctx.set("fillStyle", "green");
  ctx.call<void>("beginPath");
  ctx.call<void>("rect", 100 * sin(frameCount/360.0), 100 * cos(frameCount/360.0), 150, 100);
  ctx.call<void>("fill");
  ctx.call<void>("stroke");
  ctx.set("fillStyle", "red");
  ctx.call<void>("beginPath");
  ctx.call<void>("arc", 100 * sin(frameCount/360.0), 100 * cos(frameCount/360.0), 5, 0, 2 * pi);
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
  frameCount++;
}

void Click(emscripten::val event)
{
  static double mouseDownPageX, mouseDownPageY;
  std::string eventName = event["type"].as<std::string>();
  std::cout << eventName << "\n";
  if (eventName == "mousedown") {
    // TODO: make a dead zone so slightly dragging the mouse doesn't count as a drag, and also find out how to concatenate two maps
    kynedraw::Atom node("C");
    network.try_emplace(uuidGenerator(), node);
    kynedraw::Node visibleNode("C", event["pageX"].as<double>(), event["pageY"].as<double>());
    visibleNetwork.try_emplace(uuidGenerator(), visibleNode);
  }
}

void AddButtonEventListeners(emscripten::val element, emscripten::val index, emscripten::val array)
{
  element.call<void>("addEventListener", emscripten::val("mousedown"), emscripten::val::module_property("ClickButton"));
  element.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("ClickButton"));
}

void ClickButton(emscripten::val event)
{
  int clickedButtonID = buttonIDs.at(event["target"]["id"].as<std::string>());
  event.call<void>("stopPropagation");
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

void UpdateSelectedTool(std::string tool)
{
  int toolID = buttonIDs.at(tool);
  preview.clear();
  visiblePreview.clear();
  switch (buttonIDs.at(tool)) {
    case 21:
      // carbon
      kynedraw::Atom node("C");
      preview.try_emplace(uuidGenerator(), node);
      kynedraw::Node visibleNode("C", -1.0, -1.0);
      visiblePreview.try_emplace(uuidGenerator(), visibleNode);
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

  // initialize the selectedTool
  UpdateSelectedTool(selectedTool);
}

void MovePreview(emscripten::val event)
{
  static double previousPageX;
  static double previousPageY;
  double pageX = event["pageX"].as<double>();
  double pageY = event["pageY"].as<double>();
  for (auto& [uuid, currentVisiblePreviewNode] : visiblePreview)
  {
    currentVisiblePreviewNode.change_x(pageX - previousPageX);
    currentVisiblePreviewNode.change_y(pageY - previousPageY);
  }
  previousPageX = pageX;
  previousPageY = pageY;
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
  document.call<void>("addEventListener", emscripten::val("mousedown"), emscripten::val::module_property("Click"));
  document.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("Click"));
  document.call<void>("addEventListener", emscripten::val("mousemove"), emscripten::val::module_property("MovePreview"));

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
  emscripten::function("Click", Click);
  emscripten::function("MovePreview", MovePreview);
  emscripten::function("ResizeCanvas", ResizeCanvas);
  emscripten::function("ClickButton", ClickButton);
  emscripten::function("AddButtonEventListeners", AddButtonEventListeners);
  emscripten::function("AddToolButtonEventListener", AddToolButtonEventListener);
  emscripten::function("StoreSelectedTool", StoreSelectedTool);
  emscripten::function("AddBondSnapButtonEventListener", AddBondSnapButtonEventListener);
  emscripten::function("StoreBondSnapSetting", StoreBondSnapSetting); 
}