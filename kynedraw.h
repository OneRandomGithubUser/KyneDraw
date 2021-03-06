//
// Throughout this file, raw pointers are used instead of smart pointers as smart pointers do not work well with STL
// containers and also because it makes it more difficult to make methods that take smart pointers as arguments (thus
// being able to be called from elsewhere) while also being able to be called from other methods with the this keyword
//

#ifndef KYNEDRAW_H_
#define KYNEDRAW_H_

#include <cmath>
#include <unordered_map>
#include <array>
#include <optional>
#include <boost/uuid/uuid.hpp>
#include <boost/functional/hash.hpp>
#include <boost/geometry.hpp>
#include <boost/geometry/geometries/point.hpp>
#include <boost/geometry/geometries/segment.hpp>
#include <boost/geometry/index/rtree.hpp>

namespace kynedraw
{
  namespace settings
  {
    namespace
    {
      std::string projection = "sawhorse";
    }
    void set_projection(std::string setProjection);
  }
  class Graph;
  class Preview;
  class Molecule;
  class VisibleMolecule;
  class Node;
  class VisibleNode;
  class Bond;
  class VisibleBond;

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

  class GenericNode
  {
   protected:
    boost::uuids::uuid uuid;
    std::string name;
    int numBonds;
    int charge;
    int numH;
    int numLoneE;
    kynedraw::Molecule* molecule{};
    kynedraw::Graph* linkedGraph;
    void set_uuid(boost::uuids::uuid uuid);
    void refresh_internal_vars();
   public:
    GenericNode(boost::uuids::uuid uuid, std::string name, kynedraw::Graph& linkedGraph);
    int get_full_valence_electrons() const;
    int get_valency() const;
    boost::uuids::uuid get_uuid() const;
    std::string get_name() const;
    int get_num_bonds() const;
    int get_charge() const;
    int get_num_h() const;
    int get_num_lone_e() const;
    void smart_set_name(std::string newName);
    void smart_change_num_bonds(int changeNumBonds);
    bool operator==(const GenericNode& rhs) const noexcept;
    bool operator!=(const GenericNode& rhs) const noexcept;
    void merge(kynedraw::GenericNode& node);
  };

  class Node : public GenericNode
  {
   protected:
    std::vector<std::pair<int, kynedraw::Bond*>> linkedBonds;
    std::vector<kynedraw::VisibleNode*> linkedNodes;
   public:
    Node(boost::uuids::uuid uuid, std::string name, kynedraw::Graph& linkedGraph);
    void set_uuid(boost::uuids::uuid newUuid);
    const std::vector<std::pair<int, kynedraw::Bond*>>& get_linked_bonds();
    const std::vector<kynedraw::VisibleNode*>& get_linked_nodes();
    int add_bond_info(int bondIndexInNode, kynedraw::Bond& bond);
    void remove_bond_info(int nodeIndexInBond, kynedraw::Bond& bond);
    void merge(kynedraw::Node& node);
    void remove();
  };
  class VisibleNode : public GenericNode
  {
   protected:
    double x;
    double y;
    std::array<double, 3> predictedNextBondAngleList;
    std::vector<std::pair<int, kynedraw::VisibleBond*>> linkedBonds;
    void get_branch_helper(std::vector<kynedraw::VisibleNode*>& ans, bool& loopDetected, kynedraw::VisibleNode*& loopDetectNode, kynedraw::VisibleNode*& loopIgnoreNode);
    std::vector<kynedraw::Node*> linkedNodes;
    point_rtree* rtree;
    void set_rtree_coordinates(double initialX, double initialY, double finalX, double finalY);
   public:
    VisibleNode(boost::uuids::uuid uuid, std::string name, double x, double y, point_rtree& rtree, kynedraw::Graph& linkedGraph);
    void set_uuid(boost::uuids::uuid newUuid);
    const std::vector<std::pair<int, kynedraw::VisibleBond*>>& get_linked_bonds();
    std::vector<kynedraw::VisibleNode*> get_branch_including(int nodeIndexInBond, kynedraw::VisibleBond& bond);
    const std::vector<kynedraw::Node*>& get_linked_nodes();
    double get_x() const;
    void change_x(double change_x, bool updateBondAngle);
    void set_x(double x);
    double get_y() const;
    void change_y(double change_y, bool updateBondAngle);
    void set_y(double y);
    void change_x_y(double change_x, double change_y, bool updateBondAngle);
    void set_x_y(double x, double y);
    void refresh_predicted_next_bond_angle_list();
    double get_predicted_next_bond_angle(int newNumBonds);
    int add_bond_info(int bondIndexInNode, kynedraw::VisibleBond& bond);
    void remove_bond_info(int nodeIndexInBond, kynedraw::VisibleBond& bond);
    void merge(kynedraw::VisibleNode& node);
    void remove();
  };

/***********************************************************************************************************************
 * Bond
***********************************************************************************************************************/

  class GenericBond
  {
   protected:
    boost::uuids::uuid uuid;
    int numBonds;
    kynedraw::Graph* linkedGraph;
   public:
    GenericBond(boost::uuids::uuid uuid, int numBonds, kynedraw::Graph& linkedGraph);
    boost::uuids::uuid get_uuid() const;
    int get_num_bonds() const;
  };
  class Bond : public GenericBond
  {
   protected:
    std::array<std::pair<int, kynedraw::Node*>, 2> linkedNodes;
   public:
    Bond(boost::uuids::uuid uuid, int numBonds, kynedraw::Graph& linkedGraph);
    const std::array<std::pair<int, kynedraw::Node*>, 2>& get_linked_nodes();
    void set_linked_node(int nodeIndexInBond, int bondIndexInNode, kynedraw::Node& newNode);
    kynedraw::Node& get_node(int index) const;
    kynedraw::Node& get_node(int index);
    void remove();
  };
  class VisibleBond : public GenericBond
  {
   protected:
    double bondAngle;
    std::array<std::pair<int, kynedraw::VisibleNode*>, 2> linkedNodes;
    std::vector<std::pair<double, double>> offsetXY;
    segment_rtree* rtree;
    void rotate_branch_about_helper(std::vector<VisibleNode*> branch, kynedraw::VisibleNode& node, double radians);
    void extend_branch_from_helper(std::vector<VisibleNode*> branch, std::pair<int, VisibleNode*>& nodePair, double length);
   public:
    VisibleBond(boost::uuids::uuid uuid, int numBonds, segment_rtree& rtree, kynedraw::Graph& linkedGraph);
    double get_bond_angle(int index) const;
    void refresh_bond_angle();
    double get_bond_length() const;
    const std::array<std::pair<int, kynedraw::VisibleNode*>, 2>& get_linked_nodes();
    void set_linked_node(int nodeIndexInBond, int bondIndexInNode, kynedraw::VisibleNode& newNode);
    kynedraw::VisibleNode& get_node(int index) const;
    kynedraw::VisibleNode& get_node(int index);
    void rotate_branch_about(kynedraw::VisibleNode& node, double degrees);
    void extend_branch_from(kynedraw::VisibleNode& node, double length);
    void set_branch_coordinates_relative_to(kynedraw::VisibleNode& node, double newX, double newY);
    void snap_branch_to(kynedraw::VisibleNode& pivotNode, kynedraw::VisibleNode& snapNode);
    void set_rtree_coordinates(kynedraw::VisibleNode &endpointNode, double initialX, double initialY, double finalX, double finalY);
    void remove();
  };

/***********************************************************************************************************************
 * Graph
***********************************************************************************************************************/

  class Graph {
   protected:
    std::unordered_map<boost::uuids::uuid, kynedraw::VisibleNode, boost::hash<boost::uuids::uuid>> visibleNodes;
    std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash<boost::uuids::uuid>> nodes;
    std::unordered_map<boost::uuids::uuid, kynedraw::VisibleBond, boost::hash<boost::uuids::uuid>> visibleBonds;
    std::unordered_map<boost::uuids::uuid, kynedraw::Bond, boost::hash<boost::uuids::uuid>> bonds;
    // The container for pairs of segments and IDs
    segment_rtree segments;
    point_rtree points;
    void remove_node(kynedraw::Node &node);
    void remove_visible_node(kynedraw::VisibleNode &node);
    void remove_bond(kynedraw::Bond &bond);
    void remove_visible_bond(kynedraw::VisibleBond &bond);
   public:
    // TODO: find out how to do this better than making friend functions, if even possible
    friend void kynedraw::Node::remove();
    friend void kynedraw::VisibleNode::remove();
    friend void kynedraw::Bond::remove();
    friend void kynedraw::VisibleBond::remove();
    const std::unordered_map<boost::uuids::uuid, kynedraw::VisibleNode, boost::hash<boost::uuids::uuid>>& get_visible_nodes() const;
    const std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash<boost::uuids::uuid>> &get_nodes() const;
    const std::unordered_map<boost::uuids::uuid, kynedraw::VisibleBond, boost::hash<boost::uuids::uuid>> &get_visible_bonds() const;
    const std::unordered_map<boost::uuids::uuid, kynedraw::Bond, boost::hash<boost::uuids::uuid>> &get_bonds() const;
    kynedraw::Node &create_node(boost::uuids::uuid uuid, std::string name);
    kynedraw::VisibleNode &create_visible_node(boost::uuids::uuid uuid, std::string name, double pageX, double pageY);
    kynedraw::Bond &create_bond_between(boost::uuids::uuid uuid,
                                        int numBonds,
                                        kynedraw::Node &node1,
                                        kynedraw::Node &node2);
    kynedraw::VisibleBond &create_visible_bond_between(boost::uuids::uuid uuid,
                                                       int numBonds,
                                                       kynedraw::VisibleNode &node0,
                                                       kynedraw::VisibleNode &node1);
    void set_node_uuid(kynedraw::Node &node, boost::uuids::uuid newUuid);
    void set_visible_node_uuid(kynedraw::VisibleNode &visibleNode, boost::uuids::uuid newUuid);
    void merge(Graph &graph);
    void clear();
    void change_x_y(double changeX, double changeY);
    kynedraw::VisibleNode &find_closest_visible_node_to(double x, double y);
    kynedraw::VisibleBond &find_closest_visible_bond_to(double x, double y);
  };
  class Preview : public Graph {
   protected:
    kynedraw::VisibleNode* mouseNode;
    std::optional<kynedraw::VisibleBond*> mouseBond;
   public:
    kynedraw::VisibleNode& get_mouse_node() const;
    void set_mouse_node(kynedraw::VisibleNode& mouseNode);
    const std::optional<kynedraw::VisibleBond*>& get_mouse_bond() const;
    void set_mouse_bond(kynedraw::VisibleBond& mouseBond);
    void clear();
  };
}

#endif //KYNEDRAW_H_
