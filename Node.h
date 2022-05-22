#ifndef NODE_H_
#define NODE_H_

#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/geometry.hpp>
#include <boost/geometry/geometries/point.hpp>
#include <boost/geometry/geometries/segment.hpp>
#include <boost/geometry/index/rtree.hpp>

namespace kynedraw
{
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

  class Molecule;
  class Node;
  class VisibleNode;
  class Bond;
  class VisibleBond;

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
    GenericNode(boost::uuids::uuid uuid, std::string name);
    boost::uuids::uuid get_uuid() const;;
    std::string get_name() const;
    bool operator==(const GenericNode& rhs) const noexcept;
  };

  class Node : public GenericNode
  {
   protected:
    std::vector<std::pair<kynedraw::Bond*, int>> linkedBonds;
    std::vector<kynedraw::VisibleNode*> linkedNodes;
   public:
    Node(boost::uuids::uuid uuid, std::string name);
    const std::vector<std::pair<kynedraw::Bond*, int>>& get_linked_bonds() const;
    const std::vector<kynedraw::VisibleNode*>& get_linked_nodes() const;
    void add_bond_info(kynedraw::Bond& bond, int bondIndex);
  };
  class VisibleNode : public GenericNode
  {
   protected:
    double x;
    double y;
    double predictedNextBondAngleList[3];
    std::vector<std::pair<kynedraw::VisibleBond*, int>> linkedBonds;
    std::vector<kynedraw::Node*> linkedNodes;
    point_rtree* rtree;
   public:
    VisibleNode(boost::uuids::uuid uuid, std::string name, double x, double y, point_rtree& rtree);
    const std::vector<std::pair<kynedraw::VisibleBond*, int>>& get_linked_bonds() const;
    const std::vector<kynedraw::Node*>& get_linked_nodes() const;
    void set_rtree_coordinates(double initialX, double initialY, double finalX, double finalY);
    double get_x() const;
    void change_x(double change_x);
    void set_x(double x);
    double get_y() const;
    void change_y(double change_y);
    void set_y(double y);
    void add_bond_info(kynedraw::VisibleBond& bond, int bondIndex);
  };
}

#endif //GITHUB__NODE_H_
