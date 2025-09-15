import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { moderationRulesEngine } from '@/lib/moderation-rules-engine';

// GET /api/moderation/rules - Get all rules or execute rules
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin/moderator
    const isAdmin = user.role === 'admin' || user.role === 'moderator';
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // If action is 'test', execute rules on test content
    if (action === 'test') {
      const testContent = searchParams.get('content') || '';
      const contentType = searchParams.get('contentType') || 'question';
      const testUserId = searchParams.get('userId') || user.id;

      if (!testContent) {
        return NextResponse.json(
          { success: false, error: 'Test content required' },
          { status: 400 }
        );
      }

      const results = await moderationRulesEngine.executeRules(
        'test-content-id',
        contentType,
        testContent,
        testUserId,
        'content_posted'
      );

      return NextResponse.json({
        success: true,
        data: {
          results,
          summary: {
            rulesEvaluated: results.length,
            rulesTriggered: results.filter(r => r.triggered).length,
            totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
            actionsExecuted: results.flatMap(r => r.actionsExecuted),
            reasons: results.filter(r => r.triggered).map(r => r.reason)
          }
        }
      });
    }

    // Get all moderation rules
    const rules = await prisma.moderationRule.findMany({
      include: {
        conditions: {
          orderBy: { weight: 'desc' }
        },
        actions: true,
        _count: {
          select: {
            triggers: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'desc' }
      ]
    });

    // Get rule statistics
    const ruleStats = await Promise.all(
      rules.map(async (rule) => {
        const [recentTriggers, totalTriggers] = await Promise.all([
          prisma.ruleTrigger.count({
            where: {
              rule_id: rule.id,
              created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
          }),
          prisma.ruleTrigger.count({
            where: { rule_id: rule.id }
          })
        ]);

        return {
          ruleId: rule.id,
          recentTriggers,
          totalTriggers,
          avgConfidence: 0.85 // Would be calculated from actual data
        };
      })
    );

    const formattedRules = rules.map(rule => {
      const stats = ruleStats.find(s => s.ruleId === rule.id);
      
      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        isActive: rule.is_active,
        triggerEvent: rule.trigger_event,
        triggerFrequency: rule.trigger_frequency,
        conditions: rule.conditions.map(c => ({
          id: c.id,
          type: c.condition_type,
          operator: c.operator,
          field: c.field,
          value: c.value,
          weight: c.weight
        })),
        actions: rule.actions.map(a => ({
          id: a.id,
          type: a.action_type,
          target: a.target,
          parameters: a.parameters
        })),
        stats: {
          timesTriggered: rule.times_triggered || 0,
          recentTriggers: stats?.recentTriggers || 0,
          successRate: rule.success_rate || 0,
          avgConfidence: stats?.avgConfidence || 0
        },
        createdBy: rule.created_by,
        createdAt: rule.created_at,
        lastModified: rule.last_modified,
        lastTriggered: rule.last_triggered
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        rules: formattedRules,
        summary: {
          totalRules: rules.length,
          activeRules: rules.filter(r => r.is_active).length,
          totalTriggers: ruleStats.reduce((sum, s) => sum + s.totalTriggers, 0),
          recentTriggers: ruleStats.reduce((sum, s) => sum + s.recentTriggers, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching moderation rules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch moderation rules' },
      { status: 500 }
    );
  }
}

// POST /api/moderation/rules - Create new rule
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      priority, 
      triggerEvent, 
      triggerFrequency,
      triggerConditions,
      conditions, 
      actions 
    } = body;

    if (!name || !description || !conditions || !actions) {
      return NextResponse.json(
        { success: false, error: 'Name, description, conditions, and actions are required' },
        { status: 400 }
      );
    }

    // Validate priority
    if (priority < 1 || priority > 10) {
      return NextResponse.json(
        { success: false, error: 'Priority must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Create the rule in a transaction
    const rule = await prisma.$transaction(async (tx) => {
      // Create the main rule
      const newRule = await tx.moderationRule.create({
        data: {
          name,
          description,
          priority,
          is_active: true,
          trigger_event: triggerEvent || 'content_posted',
          trigger_frequency: triggerFrequency || 'immediate',
          trigger_conditions: triggerConditions || {},
          created_by: user.id,
          created_at: new Date(),
          last_modified: new Date()
        }
      });

      // Create conditions
      await Promise.all(
        conditions.map((condition: any) =>
          tx.ruleCondition.create({
            data: {
              rule_id: newRule.id,
              condition_type: condition.type,
              operator: condition.operator,
              field: condition.field,
              value: condition.value,
              weight: condition.weight || 1.0
            }
          })
        )
      );

      // Create actions
      await Promise.all(
        actions.map((action: any) =>
          tx.ruleAction.create({
            data: {
              rule_id: newRule.id,
              action_type: action.type,
              target: action.target,
              parameters: action.parameters || {}
            }
          })
        )
      );

      return newRule;
    });

    return NextResponse.json({
      success: true,
      data: { ruleId: rule.id },
      message: `Rule "${name}" created successfully`
    });

  } catch (error) {
    console.error('Error creating moderation rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create moderation rule' },
      { status: 500 }
    );
  }
}

// PUT /api/moderation/rules - Update rule or bulk operations
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, ruleIds, ruleId, updateData } = body;

    if (action === 'bulk') {
      // Bulk operations
      if (!ruleIds || !Array.isArray(ruleIds)) {
        return NextResponse.json(
          { success: false, error: 'Rule IDs array required for bulk operations' },
          { status: 400 }
        );
      }

      const { operation } = body;
      let result;

      switch (operation) {
        case 'activate':
          result = await prisma.moderationRule.updateMany({
            where: { id: { in: ruleIds } },
            data: { is_active: true, last_modified: new Date() }
          });
          break;

        case 'deactivate':
          result = await prisma.moderationRule.updateMany({
            where: { id: { in: ruleIds } },
            data: { is_active: false, last_modified: new Date() }
          });
          break;

        case 'delete':
          // Delete in transaction to handle related records
          result = await prisma.$transaction(async (tx) => {
            await tx.ruleTrigger.deleteMany({ where: { rule_id: { in: ruleIds } } });
            await tx.ruleAction.deleteMany({ where: { rule_id: { in: ruleIds } } });
            await tx.ruleCondition.deleteMany({ where: { rule_id: { in: ruleIds } } });
            return await tx.moderationRule.deleteMany({ where: { id: { in: ruleIds } } });
          });
          break;

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid bulk operation' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        data: { affected: result.count },
        message: `Bulk ${operation} completed on ${result.count} rules`
      });
    }

    // Single rule update
    if (!ruleId || !updateData) {
      return NextResponse.json(
        { success: false, error: 'Rule ID and update data required' },
        { status: 400 }
      );
    }

    // Update rule in transaction if conditions/actions are being updated
    const updatedRule = await prisma.$transaction(async (tx) => {
      // Update main rule
      const rule = await tx.moderationRule.update({
        where: { id: ruleId },
        data: {
          name: updateData.name,
          description: updateData.description,
          priority: updateData.priority,
          is_active: updateData.isActive,
          trigger_event: updateData.triggerEvent,
          trigger_frequency: updateData.triggerFrequency,
          trigger_conditions: updateData.triggerConditions,
          last_modified: new Date()
        }
      });

      // Update conditions if provided
      if (updateData.conditions) {
        await tx.ruleCondition.deleteMany({ where: { rule_id: ruleId } });
        await Promise.all(
          updateData.conditions.map((condition: any) =>
            tx.ruleCondition.create({
              data: {
                rule_id: ruleId,
                condition_type: condition.type,
                operator: condition.operator,
                field: condition.field,
                value: condition.value,
                weight: condition.weight || 1.0
              }
            })
          )
        );
      }

      // Update actions if provided
      if (updateData.actions) {
        await tx.ruleAction.deleteMany({ where: { rule_id: ruleId } });
        await Promise.all(
          updateData.actions.map((action: any) =>
            tx.ruleAction.create({
              data: {
                rule_id: ruleId,
                action_type: action.type,
                target: action.target,
                parameters: action.parameters || {}
              }
            })
          )
        );
      }

      return rule;
    });

    return NextResponse.json({
      success: true,
      data: { ruleId: updatedRule.id },
      message: 'Rule updated successfully'
    });

  } catch (error) {
    console.error('Error updating moderation rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update moderation rule' },
      { status: 500 }
    );
  }
}

// DELETE /api/moderation/rules - Delete rule
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');

    if (!ruleId) {
      return NextResponse.json(
        { success: false, error: 'Rule ID required' },
        { status: 400 }
      );
    }

    // Delete rule and related records in transaction
    await prisma.$transaction(async (tx) => {
      await tx.ruleTrigger.deleteMany({ where: { rule_id: ruleId } });
      await tx.ruleAction.deleteMany({ where: { rule_id: ruleId } });
      await tx.ruleCondition.deleteMany({ where: { rule_id: ruleId } });
      await tx.moderationRule.delete({ where: { id: ruleId } });
    });

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting moderation rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete moderation rule' },
      { status: 500 }
    );
  }
}