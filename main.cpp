#include <emscripten/val.h>
#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <string>
#include <math.h>
#include <numbers>
#include <iostream>
#include <fstream>
#include <unordered_map>
#include <map>
#include <vector>
#include <ranges>
#include <boost/uuid/uuid.hpp>            // uuid class
#include <boost/uuid/uuid_generators.hpp> // generators
#include <boost/uuid/uuid_io.hpp>         // streaming operators
#include <boost/functional/hash.hpp>
#include <boost/geometry.hpp>
#include <boost/geometry/geometries/point.hpp>
#include <boost/geometry/geometries/segment.hpp>
#include <boost/geometry/index/rtree.hpp>
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
  class GenericBond
  {
  protected:
    int numBonds;
  public:
    GenericBond(int numBonds)
    {
      this->numBonds = numBonds;
    }
  };
  class Bond : public GenericBond
  {
   protected:
    std::vector<kynedraw::Node*> linkedNodes;
  public:
    Bond(int numBonds, kynedraw::Node &node1, kynedraw::Node &node2) : GenericBond(numBonds)
    {
      this->linkedNodes.push_back(&node1);
      this->linkedNodes.push_back(&node2);
    }
    const std::vector<kynedraw::Node*>& get_linked_nodes() const
    {
      return linkedNodes;
    }
  };
  class VisibleBond : public GenericBond
  {
   protected:
    std::vector<kynedraw::VisibleNode*> linkedNodes;
  public:
    VisibleBond(int numBonds, kynedraw::VisibleNode &node1, kynedraw::VisibleNode &node2) : GenericBond(numBonds)
    {
      this->linkedNodes.push_back(&node1);
      this->linkedNodes.push_back(&node2);
    }
    const std::vector<kynedraw::VisibleNode*>& get_linked_nodes() const
    {
      return linkedNodes;
    }
  };
  class GenericNode
  {
  protected:
    boost::uuids::uuid uuid;
    std::string name;
    int numBonds;
    int charge;
    int numH;
    int numLoneE;
    kynedraw::Molecule* molecule;
  public:
    GenericNode(boost::uuids::uuid uuid, std::string name)
    {
      this->uuid = uuid;
      this->name = name;
    }
    std::string get_name() const
    {
      return name;
    }
    bool operator==(const GenericNode& rhs) const noexcept
    {
      return this->uuid == rhs.uuid;
    }
  };

  class Node : public GenericNode
  {
   protected:
    std::vector<kynedraw::Bond*> linkedBonds;
    std::vector<kynedraw::VisibleNode*> linkedNodes;
  public:
    Node(boost::uuids::uuid uuid, std::string name) : GenericNode(uuid, name)
    {
      //
    }
    const std::vector<kynedraw::Bond*>& get_linked_bonds() const
    {
      return linkedBonds;
    }
    const std::vector<kynedraw::VisibleNode*>& get_linked_nodes() const
    {
      return linkedNodes;
    }
    void add_bond (kynedraw::Bond &bond)
    {
      this->linkedBonds.push_back(&bond);
    }
  };
  class VisibleNode : public GenericNode
  {
  protected:
    double x;
    double y;
    double predictedNextBondAngleList[3];
    std::vector<kynedraw::VisibleBond*> linkedBonds;
    std::vector<kynedraw::Node*> linkedNodes;
  public:
    VisibleNode(boost::uuids::uuid uuid, std::string name, double x, double y) : GenericNode(uuid, name)
    {
      this->x = x;
      this->y = y;
    }
    const std::vector<kynedraw::VisibleBond*>& get_linked_bonds() const
    {
      return linkedBonds;
    }
    const std::vector<kynedraw::Node*>& get_linked_nodes() const
    {
      return linkedNodes;
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
    void add_bond (kynedraw::VisibleBond& bond)
    {
      this->linkedBonds.push_back(&bond);
    }
  };

  // RTree boilerplate taken from https://stackoverflow.com/a/25083918

  // Convenient namespaces
  namespace bg = boost::geometry;
  namespace bgm = boost::geometry::model;
  namespace bgi = boost::geometry::index;

  // Convenient types
  typedef bgm::point<double, 2, bg::cs::cartesian> point;
  typedef bgm::segment<point> segment;
  // The boost::uuids::uuid stores the uuids of the segment (VisibleBond) or of the point (VisibleNode)
  typedef bgi::rtree<std::pair<segment, boost::uuids::uuid>, bgi::rstar<16>> segment_rtree;
  typedef bgi::rtree<std::pair<point, boost::uuids::uuid>, bgi::rstar<16>> point_rtree;

  class Graph
  {
   protected:
    std::unordered_map<boost::uuids::uuid, kynedraw::VisibleNode, boost::hash<boost::uuids::uuid>> visibleNodes;
    std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash<boost::uuids::uuid>> nodes;
    std::unordered_map<boost::uuids::uuid, kynedraw::VisibleBond, boost::hash<boost::uuids::uuid>> visibleBonds;
    std::unordered_map<boost::uuids::uuid, kynedraw::Bond, boost::hash<boost::uuids::uuid>> bonds;

    // The container for pairs of segments and IDs
    segment_rtree segments;
    point_rtree points;
  public:
    const std::unordered_map<boost::uuids::uuid, kynedraw::VisibleNode, boost::hash<boost::uuids::uuid>>& get_visible_nodes() const
    {
      return visibleNodes;
    }
    const std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash<boost::uuids::uuid>>& get_nodes() const
    {
      return nodes;
    }
    const std::unordered_map<boost::uuids::uuid, kynedraw::VisibleBond, boost::hash<boost::uuids::uuid>>& get_visible_bonds() const
    {
      return visibleBonds;
    }
    const std::unordered_map<boost::uuids::uuid, kynedraw::Bond, boost::hash<boost::uuids::uuid>>& get_bonds() const
    {
      return bonds;
    }
    kynedraw::Node& create_node(boost::uuids::uuid uuid, std::string name)
    {
      auto insertion = this->nodes.try_emplace(uuid, kynedraw::Node(uuid, name));
      return insertion.first->second;
    }
    kynedraw::VisibleNode& create_visible_node(boost::uuids::uuid uuid, std::string name, double pageX, double pageY)
    {
      kynedraw::VisibleNode node(uuid, "C", pageX, pageY);
      auto insertion = this->visibleNodes.try_emplace(uuid, node);
      point p(node.get_x(), node.get_y());
      points.insert(std::make_pair(p, uuid));
      return insertion.first->second;
    }
    kynedraw::Bond& create_bond_between(boost::uuids::uuid uuid, int numBonds, kynedraw::Node& node1, kynedraw::Node& node2)
    {
      auto insertion = this->bonds.try_emplace(uuid, kynedraw::Bond(numBonds, node1, node2));
      node1.add_bond(insertion.first->second);
      node2.add_bond(insertion.first->second);
      return insertion.first->second;
    }
    kynedraw::VisibleBond& create_visible_bond_between(boost::uuids::uuid uuid, int numBonds, kynedraw::VisibleNode& node1, kynedraw::VisibleNode& node2)
    {
      auto insertion = this->visibleBonds.try_emplace(uuid, kynedraw::VisibleBond(numBonds, node1, node2));
      node1.add_bond(insertion.first->second);
      node2.add_bond(insertion.first->second);
      segment seg(point(node1.get_x(), node1.get_y()), point(node2.get_x(), node2.get_y()));
      segments.insert(std::make_pair(seg, uuid));
      return insertion.first->second;
    }
    void merge(Graph& graph)
    {
      // TODO: handle what happens when two nodes/bonds have the same UUID (i.e. are the same atom/bond) and handle VisibleNodes
      this->nodes.merge(graph.nodes);
      this->visibleNodes.merge(graph.visibleNodes);
      this->bonds.merge(graph.bonds);
      this->visibleBonds.merge(graph.visibleBonds);
      this->segments.insert(graph.segments.begin(), graph.segments.end());
      this->points.insert(graph.points.begin(), graph.points.end());
    }
    void clear()
    {
      this->nodes.clear();
      this->visibleNodes.clear();
      this->bonds.clear();
      this->visibleBonds.clear();
    }
    void change_x_y(double changeX, double changeY)
    {
      for (auto&[uuid, currentVisibleNode]: visibleNodes) {
        currentVisibleNode.change_x(changeX);
        currentVisibleNode.change_y(changeY);
      }
    }
    kynedraw::VisibleNode& find_closest_visible_node_to(double x, double y)
    {
      // NOTE: if ans.size() is 0 (that is, there are no visible nodes to be closest to), this will throw an error
      // Check for ans.size through get_visible_nodes().size() whenever you call this function
      std::vector<std::pair<point, boost::uuids::uuid>> ans;
      points.query(bgi::nearest(point(x, y), 1), std::back_inserter(ans));
      return visibleNodes.at(ans[0].second);
    }
    kynedraw::VisibleBond& find_closest_visible_bond_to(double x, double y)
    {
      // NOTE: if ans.size() is 0 (that is, there are no visible bonds to be closest to), this will throw an error
      // Check for ans.size through get_visible_bonds().size() whenever you call this function
      std::vector<std::pair<segment, boost::uuids::uuid>> ans;
      segments.query(bgi::nearest(point(x, y), 1), std::back_inserter(ans));
      return visibleBonds.at(ans[0].second);
    }
  };
  class Preview : public Graph
  {
  protected:
    kynedraw::VisibleNode* mouseNode;
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
double MOUSE_SNAP_RADIUS = 15;
double BOND_SNAP_RADIUS = 5;
boost::uuids::random_generator uuidGenerator;
emscripten::val window = emscripten::val::global("window");
emscripten::val document = emscripten::val::global("document");
emscripten::val localStorage = emscripten::val::global("localStorage");
std::string selectedTool;
std::string bondSnapSetting;

kynedraw::Graph network;
kynedraw::Preview preview;

void RenderBackground(double DOMHighResTimeStamp)
{
  emscripten::val canvas = document.call<emscripten::val>("getElementById", emscripten::val("canvas-background"));
  emscripten::val ctx = canvas.call<emscripten::val>("getContext", emscripten::val("2d"));
  ctx.call<void>("clearRect", 0, 0, canvas["width"], canvas["height"]);
  for (const auto& [uuid, currentVisibleNode] : network.get_visible_nodes())
  {
    ctx.call<void>("beginPath");
    ctx.call<void>("arc", currentVisibleNode.get_x(), currentVisibleNode.get_y(), MOUSE_SNAP_RADIUS, 0, 2 * pi);
    ctx.call<void>("stroke");
  }
  ctx.call<void>("beginPath");
  for (const auto& [uuid, currentVisibleBond] : network.get_visible_bonds())
  {
    ctx.call<void>("moveTo", currentVisibleBond.get_linked_nodes()[0]->get_x(), currentVisibleBond.get_linked_nodes()[0]->get_y());
    ctx.call<void>("lineTo", currentVisibleBond.get_linked_nodes()[1]->get_x(), currentVisibleBond.get_linked_nodes()[1]->get_y());
  }
  ctx.call<void>("stroke");
}

void RenderForeground(double DOMHighResTimeStamp)
{
  // NOTE: if this is not defined in the function, embind throws an error at runtime
  emscripten::val canvas = document.call<emscripten::val>("getElementById", emscripten::val("canvas-foreground"));
  emscripten::val ctx = canvas.call<emscripten::val>("getContext", emscripten::val("2d"));

  ctx.call<void>("clearRect", 0, 0, canvas["width"], canvas["height"]);
  for (const auto& [uuid, currentVisibleNode] : preview.get_visible_nodes())
  {
    ctx.call<void>("beginPath");
    ctx.call<void>("arc", currentVisibleNode.get_x(), currentVisibleNode.get_y(), BOND_SNAP_RADIUS, 0, 2 * pi);
    ctx.call<void>("stroke");
  }
  ctx.call<void>("beginPath");
  for (const auto& [uuid, currentVisiblePreviewBond] : preview.get_visible_bonds())
  {
    ctx.call<void>("moveTo", currentVisiblePreviewBond.get_linked_nodes()[0]->get_x(), currentVisiblePreviewBond.get_linked_nodes()[0]->get_y());
    ctx.call<void>("lineTo", currentVisiblePreviewBond.get_linked_nodes()[1]->get_x(), currentVisiblePreviewBond.get_linked_nodes()[1]->get_y());
  }
  ctx.call<void>("stroke");

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
  switch (buttonIDs.at(tool)) {
    case 10: {
      // single
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      kynedraw::Node& node1 = preview.create_node(uuid, "C");
      kynedraw::VisibleNode& visibleNode1 = preview.create_visible_node(uuid, "C", pageX, pageY);
      uuid = uuidGenerator();
      kynedraw::Node& node2 = preview.create_node(uuid, "C");
      kynedraw::VisibleNode& visibleNode2 = preview.create_visible_node(uuid,
                                                                        "C",
                                                                        pageX + BOND_LENGTH * std::cos(pi * 11 / 6),
                                                                        pageY + BOND_LENGTH * std::sin(pi * 11 / 6));
      uuid = uuidGenerator();
      preview.create_bond_between(uuid, 1, node1, node2);
      preview.create_visible_bond_between(uuid, 1, visibleNode1, visibleNode2);
      break;
    }
    case 21: {
      // carbon
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      preview.create_node(uuid, "C");
      preview.create_visible_node(uuid, "C", pageX, pageY);
      break;
    }
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
  window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderForeground"));
  event.call<void>("stopPropagation");
}

void MouseMove(double pageX, double pageY, bool mouseIsPressed, double mouseDownPageX, double mouseDownPageY)
{
  static double previousPageX, previousPageY;
  if (mouseIsPressed && std::abs(mouseDownPageX - pageX) < DEADZONE_WIDTH && std::abs(mouseDownPageY - pageY) < DEADZONE_HEIGHT)
  {
    //
  } else {
    preview.change_x_y(pageX - previousPageX, pageY - previousPageY);
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
    // If mouseIsPressed is false and there is a mouseup event, that means that the mouse was clicked and dragged from a UI button to the canvas
    /* TODO: create an UpdateAndRenderBackground that determines if the action of merging network and preview will not
     * need to clear the screen and render everything again, which is an expensive operation, by seeing if the only
     * changes that occur are either that no node/bonds have been merged or only carbon atoms that don't have a label
     * have been merged */
    network.merge(preview);
    mouseIsPressed = false;
    ResetPreview(selectedTool, pageX, pageY);
    window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderBackground"));
  }
  window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderForeground"));
  if (network.get_visible_nodes().size() != 0)
  {
    kynedraw::VisibleNode& closestVisibleNode = network.find_closest_visible_node_to(pageX, pageY);
  }
  if (network.get_visible_bonds().size() != 0)
  {
    kynedraw::VisibleBond& closestVisibleBond = network.find_closest_visible_bond_to(pageX, pageY);
  }
}

void ResizeCanvas(emscripten::val canvas, emscripten::val index, emscripten::val array)
{
  canvas.set("width", window["innerWidth"]);
  canvas.set("height", window["innerHeight"]);
}

void ResizeCanvases(emscripten::val event)
{
  document.call<emscripten::val>("querySelectorAll", emscripten::val(".canvas")).call<void>("forEach", emscripten::val::module_property("ResizeCanvas"));
}

void RunMainLoop()
{
  // emscripten_set_main_loop(RenderForeground, 0, 1);
}

int main()
{
  window.call<void>("addEventListener", emscripten::val("resize"), emscripten::val::module_property("ResizeCanvases"));
  document.call<void>("addEventListener", emscripten::val("mousedown"), emscripten::val::module_property("InteractWithCanvas"));
  document.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("InteractWithCanvas"));
  document.call<void>("addEventListener", emscripten::val("mousemove"), emscripten::val::module_property("InteractWithCanvas"));

  // add event listeners, which search for button elements or for labels that are at the same level in the DOM tree as the radio buttons with the specified name
  // NOTE: this will affect EVERY <button> element. Not a problem for now...
  document.call<emscripten::val>("querySelectorAll", emscripten::val("[name=tool-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddToolButtonEventListener"));
  document.call<emscripten::val>("querySelectorAll", emscripten::val("[name=bond-snap-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddBondSnapButtonEventListener"));
  document.call<emscripten::val>("querySelectorAll", emscripten::val("button, [name=tool-selection-button] + label, [name=bond-snap-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddButtonEventListeners"));

  // initialize width and height of the canvas
  document.call<emscripten::val>("querySelectorAll", emscripten::val(".canvas")).call<void>("forEach", emscripten::val::module_property("ResizeCanvas"));

  // retrieve all settings from localStorage and set the appropriate boxes to "checked" and put the appropriate data into preview
  InitializeAllSettings();

  // RunMainLoop();
  return 0;
}

EMSCRIPTEN_BINDINGS(bindings)
{
  emscripten::function("InteractWithCanvas", InteractWithCanvas);
  emscripten::function("ResizeCanvases", ResizeCanvases);;
  emscripten::function("ResizeCanvas", ResizeCanvas);
  emscripten::function("RenderBackground", RenderBackground);
  emscripten::function("RenderForeground", RenderForeground);
  emscripten::function("ClickButton", ClickButton);
  emscripten::function("AddButtonEventListeners", AddButtonEventListeners);
  emscripten::function("AddToolButtonEventListener", AddToolButtonEventListener);
  emscripten::function("StoreSelectedTool", StoreSelectedTool);
  emscripten::function("AddBondSnapButtonEventListener", AddBondSnapButtonEventListener);
  emscripten::function("StoreBondSnapSetting", StoreBondSnapSetting); 
}