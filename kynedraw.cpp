#include <cmath>
#include <unordered_map>
#include <boost/uuid/uuid.hpp>
#include <boost/functional/hash.hpp>
#include <boost/geometry.hpp>
#include <boost/geometry/geometries/point.hpp>
#include <boost/geometry/geometries/segment.hpp>
#include <boost/geometry/index/rtree.hpp>

import kynedraw;

// RTree boilerplate taken from https://stackoverflow.com/a/25083918

// Convenient namespaces
namespace bg = boost::geometry;
namespace bgm = boost::geometry::model;
namespace bgi = boost::geometry::index;

// Convenient types
typedef bgm::point<double, 2, bg::cs::cartesian> point;
typedef bgm::segment<point> segment;
// The boost::uuids::uuid stores the uuids of the segment (VisibleBond) or of the point (VisibleNode)
typedef bgi::rtree<std::pair<point, boost::uuids::uuid>, bgi::rstar<16>> point_rtree;
typedef bgi::rtree<std::pair<segment, boost::uuids::uuid>, bgi::rstar<16>> segment_rtree;

/***********************************************************************************************************************
 * Node
***********************************************************************************************************************/

kynedraw::GenericNode::GenericNode(boost::uuids::uuid uuid, std::string name, kynedraw::Graph& linkedGraph) {
  this->uuid = uuid;
  this->name = name;
  this->linkedGraph = &linkedGraph;
  numBonds = 0;
  charge = 0;
  numH = get_valence();
  numLoneE = 0;
}
int kynedraw::GenericNode::get_valence() const {
  static std::unordered_map<std::string, int> valenceMap = {
      {"H", 1},
      {"C", 4},
      {"O", 1},
      {"N", 1},
      {"Br", 1},
      {"Cl", 1},
      {"S", 1}
  };
  return valenceMap.at(name);
}
boost::uuids::uuid kynedraw::GenericNode::get_uuid() const {
  return uuid;
}
void kynedraw::GenericNode::set_uuid(boost::uuids::uuid uuid) {
  // TODO: increase interconnectedness and make setting uuid of one object change its uuids in the unordered_map of its linked objects
  this->uuid = uuid;
}
std::string kynedraw::GenericNode::get_name() const {
  return name;
}
int kynedraw::GenericNode::get_num_bonds() const {
  return numBonds;
}
int kynedraw::GenericNode::get_charge() const {
  return charge;
}
int kynedraw::GenericNode::get_num_h() const {
  return numH;
}
int kynedraw::GenericNode::get_num_lone_e() const {
  return numLoneE;
}
bool kynedraw::GenericNode::operator==(const kynedraw::GenericNode &rhs) const noexcept {
  return uuid == rhs.uuid;
}
bool kynedraw::GenericNode::operator!=(const kynedraw::GenericNode &rhs) const noexcept {
  return uuid != rhs.uuid;
}
void kynedraw::GenericNode::merge(kynedraw::GenericNode& node) {
  // check that the nodes that are trying to be merged together can even be merged together
  if (uuid != node.get_uuid())
  {
    throw std::invalid_argument("tried to merge nodes with different uuids");
  }
  if (name != node.get_name())
  {
    throw std::invalid_argument("tried to merge nodes with different names");
  }
  numBonds += node.get_num_bonds();
  numH -= node.get_num_bonds();
  if (numH < 0) {
    // if there aren't enough hydrogens to change into regular bonds, change the charge and number of unbonded electrons to cover the difference and maintain the octet
    charge -= numH;
    numLoneE += 2 * numH;
    numH = 0;
    if (numLoneE < 0) {
      // if doing this uses too many unbonded electrons, violate the octet
      charge += numLoneE;
      numLoneE = 0;
    }
  } else if (numH > 0 && charge > 0) {
    // if there is a positive charge and hydrogens that can be sacrified, break the bond to the hydrogen
    if (numH > charge) {
      numH -= charge;
      charge = 0;
    } else {
      charge -= numH;
      numH = 0;
    }
  }
}
kynedraw::Node::Node(boost::uuids::uuid uuid, std::string name, kynedraw::Graph& linkedGraph) : GenericNode(uuid, name, linkedGraph)
{
  //
}
const std::unordered_map<boost::uuids::uuid, kynedraw::Bond*, boost::hash<boost::uuids::uuid>>& kynedraw::Node::get_linked_bonds() const {
  return linkedBonds;
}
const std::vector<kynedraw::VisibleNode *>& kynedraw::Node::get_linked_nodes() const {
  return linkedNodes;
}
void kynedraw::Node::add_bond_info(kynedraw::Bond& bond) {
  linkedBonds.try_emplace(bond.get_uuid(), &bond);
}
void kynedraw::Node::remove_bond_info(kynedraw::Bond& bond) {
  linkedBonds.erase(bond.get_uuid());
}
void kynedraw::Node::merge(kynedraw::Node& node)
{
  this->kynedraw::GenericNode::merge(node);
  node.remove_links();
}
void kynedraw::Node::remove_links()
{
  // look at each of the linked bonds and delete them
  for (auto& [uuid, bondPointer] : linkedBonds)
  {
    bondPointer->remove_links();
  }
}
kynedraw::VisibleNode::VisibleNode(boost::uuids::uuid uuid,
                                   std::string name,
                                   double x,
                                   double y,
                                   kynedraw::point_rtree &rtree,
                                   kynedraw::Graph& linkedGraph) : GenericNode(uuid, name, linkedGraph)
{
  this->x = x;
  this->y = y;
  this->rtree = &rtree;
}
const std::unordered_map<boost::uuids::uuid, kynedraw::VisibleBond*, boost::hash<boost::uuids::uuid>> &kynedraw::VisibleNode::get_linked_bonds() const {
  return linkedBonds;
}
const std::vector<kynedraw::Node*> &kynedraw::VisibleNode::get_linked_nodes() const {
  return linkedNodes;
}
void kynedraw::VisibleNode::set_rtree_coordinates(double initialX, double initialY, double finalX, double finalY) {
  // though I wish you could call this as an updating function without any parameters, boost's rtree does not let me remove a point unless I know where it is
  // why I can't remove it if I just know its Indexable ID, I do not know
  rtree->remove(std::make_pair(point(initialX, initialY), uuid));
  rtree->insert(std::make_pair(point(finalX, finalY), uuid));
  for (auto& [uuid, currentBond] : linkedBonds)
  {
    currentBond->set_rtree_coordinates(*this, initialX, initialY, finalX, finalY);
  }
}
double kynedraw::VisibleNode::get_x() const {
  return x;
}
void kynedraw::VisibleNode::change_x(double change_x) {
  this->set_rtree_coordinates(x, y, x + change_x, y);
  x += change_x;
}
void kynedraw::VisibleNode::set_x(double x) {
  this->set_rtree_coordinates(this->x, y, x, y);
  this->x = x;
}
double kynedraw::VisibleNode::get_y() const {
  return y;
}
void kynedraw::VisibleNode::change_y(double change_y) {
  this->set_rtree_coordinates(x, y, x, y + change_y);
  this->y += change_y;
}
void kynedraw::VisibleNode::set_y(double y) {
  this->set_rtree_coordinates(x, this->y, x, y);
  this->y = y;
}
void kynedraw::VisibleNode::change_x_y(double change_x, double change_y) {
  this->set_rtree_coordinates(x, y, x + change_x, y + change_y);
  x += change_x;
  y += change_y;
}
void kynedraw::VisibleNode::set_x_y(double x, double y) {
  this->set_rtree_coordinates(this->x, this->y, x, y);
  this->x = x;
  this->y = y;
}
void kynedraw::VisibleNode::add_bond_info(kynedraw::VisibleBond &bond) {
  this->linkedBonds.try_emplace(bond.get_uuid(), &bond);
}
void kynedraw::VisibleNode::remove_bond_info(kynedraw::VisibleBond& bond) {
  linkedBonds.erase(bond.get_uuid());
}
void kynedraw::VisibleNode::merge(kynedraw::VisibleNode& node)
{
  // NOTE: this tolerance of 0.1% is to account for floating point errors and can be adjusted as necessary
  // it shouldn't be important since they should have exactly the same coordinates anyways
  // this is why it uses a box rather than a circle to check their coordinates
  if (abs(x-node.get_x())/(x) > 0.001 || abs(y-node.get_y())/(y) > 0.001)
  {
    throw std::invalid_argument("tried to merge visibleNodes with different positions");
  }
  this->kynedraw::GenericNode::merge(node);
  node.remove_links();
}
void kynedraw::VisibleNode::change_linked_bond_uuid(kynedraw::VisibleBond &bond, boost::uuids::uuid newUuid) {
  // changes the key of the linked bond to sync it with the bond's uuid
  // TODO: add this function for VisibleBond
  auto mapNode = linkedBonds.extract(bond.get_uuid());
  mapNode.key() = newUuid;
  linkedBonds.insert(std::move(mapNode));
}
void kynedraw::VisibleNode::remove_links()
{
  // look at each of the linked bonds and delete them
  for (auto& [uuid, bondPointer] : linkedBonds)
  {
    bondPointer->remove_links();
  }
  rtree->remove(std::make_pair(point(x, y), uuid));
}

/***********************************************************************************************************************
 * Bond
***********************************************************************************************************************/

kynedraw::GenericBond::GenericBond(boost::uuids::uuid uuid, int numBonds, kynedraw::Graph& linkedGraph) {
  this->uuid = uuid;
  this->numBonds = numBonds;
  this->linkedGraph = &linkedGraph;
}
boost::uuids::uuid kynedraw::GenericBond::get_uuid() const {
  return uuid;
}
kynedraw::Bond::Bond(boost::uuids::uuid uuid, int numBonds, kynedraw::Node &node1, kynedraw::Node &node2, kynedraw::Graph& linkedGraph) : GenericBond(uuid, numBonds, linkedGraph)
{
  this->linkedNodes.try_emplace(node1.get_uuid(), &node1);
  this->linkedNodes.try_emplace(node2.get_uuid(), &node2);
}
const std::unordered_map<boost::uuids::uuid, kynedraw::Node*, boost::hash<boost::uuids::uuid>>& kynedraw::Bond::get_linked_nodes() const {
  // NOTE: linkedNodes should ALWAYS only have two elements
  return linkedNodes;
}
kynedraw::Node& kynedraw::Bond::get_first_node() const
{
  return *(linkedNodes.begin()->second);
}
kynedraw::Node& kynedraw::Bond::get_second_node() const
{
  return *(std::next(linkedNodes.begin())->second);
}
void kynedraw::Bond::remove_links() {
  // NOTE: removing bond info while removing bond from a node might cause problems
  for (auto& [uuid, nodePointer] : linkedNodes)
  {
    nodePointer->remove_bond_info(*this);
  }
}
kynedraw::VisibleBond::VisibleBond(boost::uuids::uuid uuid,
                                   int numBonds,
                                   kynedraw::VisibleNode &node1,
                                   kynedraw::VisibleNode &node2,
                                   segment_rtree &rtree,
                                   kynedraw::Graph& linkedGraph) : GenericBond(uuid, numBonds, linkedGraph)
{
  this->linkedNodes.try_emplace(node1.get_uuid(), &node1);
  this->linkedNodes.try_emplace(node2.get_uuid(), &node2);
  this->rtree = &rtree;
}
const std::unordered_map<boost::uuids::uuid, kynedraw::VisibleNode*, boost::hash<boost::uuids::uuid>>& kynedraw::VisibleBond::get_linked_nodes() const {
  // NOTE: linkedNodes should ALWAYS only have two elements
  return linkedNodes;
}
kynedraw::VisibleNode& kynedraw::VisibleBond::get_first_node() const
{
  return *(linkedNodes.begin()->second);
}
kynedraw::VisibleNode& kynedraw::VisibleBond::get_second_node() const
{
  return *(std::next(linkedNodes.begin())->second);
}
void kynedraw::VisibleBond::set_rtree_coordinates(kynedraw::VisibleNode &endpointNode, double initialX, double initialY, double finalX, double finalY) {
  for (auto& [uuid, nodePointer] : linkedNodes)
  {
    if (*nodePointer != endpointNode)
    {
      // preserve the coordinates of nodePointer
      // TODO: figure out the best way to save the order of the points in the segment, or if the order even matters
      rtree->remove(std::make_pair(segment(point(initialX, initialY),
                                          point(nodePointer->get_x(), nodePointer->get_y())), uuid));
      rtree->remove(std::make_pair(segment(point(nodePointer->get_x(), nodePointer->get_y()),
                                   point(initialX, initialY)), uuid));
      rtree->insert(std::make_pair(segment(point(finalX, finalY), point(nodePointer->get_x(), nodePointer->get_y())),
                                   uuid));
    }
    break;
  }
  // it may seem wasteful to refresh BOTH nodes, but boost rtrees are currently not mutable so we're going to have to delete and insert the entire segment anyways0
}
void kynedraw::VisibleBond::remove_links()
{
  for (auto& [uuid, nodePointer] : linkedNodes)
  {
    nodePointer->remove_bond_info(*this);
  }
  kynedraw::VisibleNode& firstNode = *(linkedNodes.begin()->second);
  kynedraw::VisibleNode& secondNode = *(std::next(linkedNodes.begin())->second);
  rtree->remove(std::make_pair(segment(point(firstNode.get_x(), firstNode.get_y()), point(secondNode.get_x(), secondNode.get_y())), uuid));
}

/***********************************************************************************************************************
 * Graph
***********************************************************************************************************************/

const std::unordered_map<boost::uuids::uuid, kynedraw::VisibleNode, boost::hash<boost::uuids::uuid>> &kynedraw::Graph::get_visible_nodes() const {
  return visibleNodes;
}
const std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash<boost::uuids::uuid>> &kynedraw::Graph::get_nodes() const {
  return nodes;
}
const std::unordered_map<boost::uuids::uuid, kynedraw::VisibleBond, boost::hash<boost::uuids::uuid>> &kynedraw::Graph::get_visible_bonds() const {
  return visibleBonds;
}
const std::unordered_map<boost::uuids::uuid, kynedraw::Bond, boost::hash<boost::uuids::uuid>> &kynedraw::Graph::get_bonds() const {
  return bonds;
}
kynedraw::Node &kynedraw::Graph::create_node(boost::uuids::uuid uuid, std::string name) {
  kynedraw::Node newNode(uuid, name, *this);
  kynedraw::Node &insertedNode = this->nodes.try_emplace(uuid, newNode).first->second;
  return insertedNode;
}
kynedraw::VisibleNode &kynedraw::Graph::create_visible_node(boost::uuids::uuid uuid,
                                                            std::string name,
                                                            double pageX,
                                                            double pageY) {
  kynedraw::VisibleNode newNode(uuid, "C", pageX, pageY, points, *this);
  kynedraw::VisibleNode &insertedNode = this->visibleNodes.try_emplace(uuid, newNode).first->second;
  points.insert(std::make_pair(point(pageX, pageY), uuid));
  return insertedNode;
}
kynedraw::Bond &kynedraw::Graph::create_bond_between(boost::uuids::uuid uuid,
                                                     int numBonds,
                                                     kynedraw::Node &node1,
                                                     kynedraw::Node &node2) {
  kynedraw::Bond newBond(uuid, numBonds, node1, node2, *this);
  kynedraw::Bond &insertedBond = this->bonds.try_emplace(uuid, newBond).first->second;
  node1.add_bond_info(insertedBond);
  node2.add_bond_info(insertedBond);
  return insertedBond;
}
kynedraw::VisibleBond &kynedraw::Graph::create_visible_bond_between(boost::uuids::uuid uuid,
                                                                    int numBonds,
                                                                    kynedraw::VisibleNode &node1,
                                                                    kynedraw::VisibleNode &node2) {
  kynedraw::VisibleBond newBond(uuid, numBonds, node1, node2, segments, *this);
  VisibleBond &insertedBond = this->visibleBonds.try_emplace(uuid, newBond).first->second;
  node1.add_bond_info(insertedBond);
  node2.add_bond_info(insertedBond);
  segments.insert(std::make_pair(segment(point(node1.get_x(), node1.get_y()), point(node2.get_x(), node2.get_y())),
                                 uuid));
  return insertedBond;
}
void kynedraw::Graph::remove_node(kynedraw::Node &node) {
  nodes.erase(node.get_uuid());
}
void kynedraw::Graph::remove_visible_node(kynedraw::VisibleNode &node) {
  visibleNodes.erase(node.get_uuid());
}
void kynedraw::Graph::remove_bond(kynedraw::Bond &bond) {
  bonds.erase(bond.get_uuid());
}
void kynedraw::Graph::remove_visible_bond(kynedraw::VisibleBond &bond) {
  visibleBonds.erase(bond.get_uuid());
}

void kynedraw::Graph::change_visible_node_uuid(kynedraw::VisibleNode &visibleNode, boost::uuids::uuid newUuid) {
  // NOTE: this mapNode is not related to kynedraw::Node or kynedraw::VisibleNode, just changes the key
  auto mapNode = visibleNodes.extract(visibleNode.get_uuid());
  mapNode.key() = newUuid;
  visibleNodes.insert(std::move(mapNode));
  visibleNode.set_uuid(newUuid);
}
void kynedraw::Graph::merge(kynedraw::Graph &graph) {
  // TODO: handle what happens when two nodes/bonds have the same UUID (i.e. are the same atom/bond) and handle VisibleNodes
  this->nodes.merge(graph.nodes);
  for (auto&[uuid, node] : graph.nodes) {
    this->nodes.at(uuid).merge(node);
  }
  graph.nodes.clear();
  this->visibleNodes.merge(graph.visibleNodes);
  graph.visibleNodes.clear();
  this->bonds.merge(graph.bonds);
  graph.bonds.clear();
  this->visibleBonds.merge(graph.visibleBonds);
  graph.visibleBonds.clear();
  this->segments.insert(graph.segments.begin(), graph.segments.end());
  this->points.insert(graph.points.begin(), graph.points.end());
}
void kynedraw::Graph::clear() {
  this->nodes.clear();
  this->visibleNodes.clear();
  this->bonds.clear();
  this->visibleBonds.clear();
}
void kynedraw::Graph::change_x_y(double changeX, double changeY) {
  for (auto&[uuid, currentVisibleNode] : visibleNodes) {
    currentVisibleNode.change_x_y(changeX, changeY);
  }
}
kynedraw::VisibleNode &kynedraw::Graph::find_closest_visible_node_to(double x, double y) {
  // NOTE: if ans.size() is 0 (that is, there are no visible nodes to be closest to), this will throw an error
  // Check for ans.size through get_visible_nodes().size() whenever you call this function
  std::vector<std::pair<point, boost::uuids::uuid>> ans;
  points.query(bgi::nearest(point(x, y), 1), std::back_inserter(ans));
  return visibleNodes.at(ans[0].second);
}
kynedraw::VisibleBond &kynedraw::Graph::find_closest_visible_bond_to(double x, double y) {
  // NOTE: if ans.size() is 0 (that is, there are no visible bonds to be closest to), this will throw an error
  // Check for ans.size through get_visible_bonds().size() whenever you call this function
  std::vector<std::pair<segment, boost::uuids::uuid>> ans;
  segments.query(bgi::nearest(point(x, y), 1), std::back_inserter(ans));
  return visibleBonds.at(ans[0].second);
}
kynedraw::VisibleNode &kynedraw::Preview::get_mouse_node() const {
  return *mouseNode;
}
void kynedraw::Preview::set_mouse_node(kynedraw::VisibleNode &mouseNode) {
  this->mouseNode = &mouseNode;
}